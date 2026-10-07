'use client';

import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useTranslations } from 'next-intl';
import { useStore } from '@/store';
import { useHydrated } from '@/store/useHydrated';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApi, userApi, getApiErrorMessage } from '@/lib/api';
import { motion } from 'framer-motion';
import { Package, Settings, LogOut } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import type { Order } from '@/types/models';
import { Pagination } from '@/components/ui/pagination';

type Tab = 'orders' | 'settings';
type ProfileForm = { nickname: string; phone: string; address: string };

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, token, clearAuth, setAuth } = useStore();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const router = useRouter();

  // 等持久化状态恢复后再检查登录状态
  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [user, hydrated, router]);

  const [tab, setTab] = useState<Tab>('orders');
  const [ordersPage, setOrdersPage] = useState(0);

  const [formChanges, setFormChanges] = useState<Partial<ProfileForm>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const paying = useRef(false);
  const [paymentMessage, setPaymentMessage] = useState<{ orderId: number; userId: number; message: string; error: boolean } | null>(null);
  const paymentMutation = useMutation({
    mutationFn: async (order: Order) => {
      const sessionToken = useStore.getState().token;
      const method = ['WECHAT_PAY', 'ALIPAY', 'PAYPAL'].includes(order.paymentMethod || '') ? order.paymentMethod! : 'ALIPAY';
      const result = await orderApi.processPayment(order.id, method);
      if (useStore.getState().token !== sessionToken) throw new Error(t('sessionChanged'));
      if (result.data?.success !== true || result.data?.data?.status !== 'PAID') throw new Error(t('paymentFailed'));
    },
    onSuccess: (_, order) => {
      setPaymentMessage({ orderId: order.id, userId: user!.id, message: t('paymentSucceeded'), error: false });
      void queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (error, order) => {
      if (user) setPaymentMessage({ orderId: order.id, userId: user.id, message: getApiErrorMessage(error, error instanceof Error && !isAxiosError(error) ? error.message : t('paymentFailed')), error: true });
    },
  });
  const handlePayment = (order: Order) => {
    if (paying.current || !token || !user) return;
    paying.current = true;
    setPaymentMessage(null);
    paymentMutation.mutate(order, { onSettled: () => { paying.current = false; } });
  };
  const { data: profileData } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => userApi.getProfile(),
    enabled: hydrated && !!user && !!token,
  });
  const profile = profileData?.data?.data || user;
  const form: ProfileForm = {
    nickname: profile?.nickname || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    ...formChanges,
  };

  // hooks 必须每次 render 都执行；未登录时不请求
  const { data: ordersData, isPending: loadingOrders, isError: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ['my-orders', user?.id, ordersPage],
    queryFn: () => orderApi.getMyOrders({ page: ordersPage, size: 20 }),
    enabled: hydrated && !!user && !!token,
    staleTime: 1000 * 60 * 5, // 5 分钟内不自动刷新
    refetchOnWindowFocus: true, // 窗口获得焦点时刷新
  });

  // 持久化状态尚未恢复，显示加载中，避免闪跳登录页
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="text-sm text-zinc-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const orders: Order[] = ordersData?.data?.data?.content || [];

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    SHIPPED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DELIVERED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    CANCELLED: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    REFUNDED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await userApi.updateProfile(form);
      if (res.data?.success && res.data?.data && token && useStore.getState().token === token) {
        const updated = res.data.data;
        setAuth(
            {
              ...user,
              nickname: updated.nickname,
              phone: updated.phone,
              address: updated.address,
            },
            token
        );
        queryClient.setQueryData(['profile', user.id], res);
        setFormChanges({});
        setSaveMessage('个人信息已保存。');
      } else {
        throw new Error('保存失败，请重试。');
      }
    } catch (error) {
      setSaveMessage(isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || '保存失败，请检查网络后重试。' : '保存失败，请重试。');
    } finally {
      setSaving(false);
    }
  };

  return (
      // 注意：Navbar/Footer/页面撑高由 RootLayout 负责，这里只写页面内容
      <div className="bg-white dark:bg-zinc-950">
        <main className="mx-auto w-full max-w-4xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex items-center gap-6"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-2xl font-bold text-white">
              {(profile?.nickname || user.username)?.[0]?.toUpperCase() || 'U'}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {profile?.nickname || user.username}
              </h1>
              <p className="text-zinc-500">{user.email}</p>

              {user.role === 'ADMIN' && (
                  <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                管理员
              </span>
              )}
            </div>

            <div className="ml-auto flex gap-2">
              {user.role === 'ADMIN' && (
                  <button
                      onClick={() => router.push('/admin')}
                      className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    进入后台
                  </button>
              )}

              <button
                  onClick={() => {
                    clearAuth();
                    router.push('/');
                  }}
                  className="flex items-center gap-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                <LogOut className="h-4 w-4" /> 退出
              </button>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="mb-6 flex border-b border-zinc-200 dark:border-zinc-800">
            {([
              { id: 'orders', label: t('orders'), icon: Package },
              { id: 'settings', label: t('settings'), icon: Settings },
            ] as const).map(({ id, label, icon: Icon }) => (
                <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                        tab === id
                            ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                            : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
            ))}
          </div>

          {/* Orders Tab */}
          {tab === 'orders' && (
              <div className="space-y-4">
                {loadingOrders ? <p role="status" className="py-16 text-center text-zinc-400">正在加载订单...</p> : ordersError ? <p role="alert" className="py-16 text-center text-red-600">订单加载失败。<button onClick={() => { void refetchOrders(); }} className="ml-2 underline">重试</button></p> : orders.length === 0 ? (
                    <div className="py-16 text-center text-zinc-400">暂无订单</div>
                ) : (
                    orders.map((order) => (
                        <div
                            key={order.id}
                            className="rounded-2xl border border-zinc-100 p-5 dark:border-zinc-800"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-white">
                                订单号: {order.orderNo}
                              </p>
                              <p className="text-sm text-zinc-400">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                      <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                              STATUS_COLORS[order.status] || ''
                          }`}
                      >
                        {t(`orderStatus.${order.status}`)}
                      </span>
                              <p className="font-bold text-zinc-900 dark:text-white">
                                {formatPrice(order.totalAmount)}
                              </p>
                            </div>
                          </div>

                          {order.items && order.items.length > 0 && (
                              <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between text-sm text-zinc-500"
                                    >
                          <span>
                            {item.productName} × {item.quantity}
                          </span>
                                      <span>{formatPrice(item.totalPrice)}</span>
                                    </div>
                                ))}
                              </div>
                          )}
                          {order.status === 'PENDING' && (
                            <button type="button" disabled={paymentMutation.isPending} onClick={() => handlePayment(order)} className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                              {paymentMutation.isPending && paymentMutation.variables?.id === order.id ? t('paying') : t('continuePayment')} · {t('testPayment')}
                            </button>
                          )}
                          {paymentMessage?.orderId === order.id && paymentMessage.userId === user.id && <p role={paymentMessage.error ? 'alert' : 'status'} className={`mt-3 text-sm ${paymentMessage.error ? 'text-red-600' : 'text-zinc-500'}`}>{paymentMessage.message}</p>}
                        </div>
                    ))
                )}
                <Pagination page={ordersPage} totalPages={ordersData?.data.data.totalPages ?? 0} onChange={setOrdersPage} disabled={loadingOrders} />
              </div>
          )}

          {/* Settings Tab */}
          {tab === 'settings' && (
              <form onSubmit={handleSave} className="max-w-lg space-y-4">
                {[
                  { key: 'nickname', label: t('nickname'), type: 'text' },
                  { key: 'phone', label: t('phone'), type: 'tel' },
                  { key: 'address', label: t('address'), type: 'text' },
                ].map((field) => (
                    <div key={field.key}>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {field.label}
                      </label>
                      <input
                          type={field.type}
                          value={form[field.key as keyof typeof form]}
                          onChange={(e) =>
                              setFormChanges((f) => ({ ...f, [field.key]: e.target.value }))
                          }
                          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </div>
                ))}

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                >
                  {saving ? '保存中...' : t('save')}
                </button>
                {saveMessage && <p role="status" className="text-sm text-zinc-500">{saveMessage}</p>}
              </form>
          )}
        </main>
      </div>
  );
}
