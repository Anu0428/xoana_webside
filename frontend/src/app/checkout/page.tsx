'use client';

import { galleryImageUrl } from '@/lib/gallery';

import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useStore, type CartItem } from '@/store';
import { useHydrated } from '@/store/useHydrated';
import { orderApi, productApi, settingsApi } from '@/lib/api';
import { getSampleProductById } from '@/lib/sample-products';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { CheckCircle, CreditCard, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

type PaymentMethod = 'WECHAT_PAY' | 'ALIPAY' | 'PAYPAL';

export default function CheckoutPage() {
  const t = useTranslations('checkout');
  const { cart, user, token } = useStore();
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [formChanges, setForm] = useState<Partial<{ name: string; phone: string; address: string }>>({});
  const form = {
    name: user?.nickname || user?.username || '',
    phone: user?.phone || '',
    address: user?.address || '',
    ...formChanges,
  };
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ALIPAY');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<{ id: number; userId: number; items: CartItem[] } | null>(null);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const { data: settings, isPending: loadingSettings, isError: settingsError, refetch } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => settingsApi.get(),
  });
  const checkoutEnabled = settings?.data?.data?.checkoutEnabled === true;
  const orderId = pendingOrder?.userId === user?.id ? pendingOrder?.id : undefined;
  const summaryItems = orderId && pendingOrder ? pendingOrder.items : cart;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || !hydrated || loadingSettings || !checkoutEnabled || summaryItems.length === 0) return;
    if (!user || !token) {
      router.push('/login');
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('请填写完整的联系人、联系电话和收货地址。');
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      const orderedItems = summaryItems.map(item => ({ ...item }));
      if (!orderId) {
        // Old persisted carts can still contain samples added by previous versions.
        const sampleItems = orderedItems.filter(item => getSampleProductById(item.id));
        for (const item of sampleItems) {
          try {
            const product = await productApi.getById(item.id);
            if (product.data?.success !== true || !product.data?.data?.id) throw new Error('Missing product');
          } catch {
            throw new Error(`“${item.name}”是展示样品，暂不支持在线下单。请从购物车移除样品或联系我们购买。`);
          }
        }
      }
      const orderData = {
        items: orderedItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
        shippingAddress: form.address.trim(),
        contactName: form.name.trim(),
        contactPhone: form.phone.trim(),
        paymentMethod,
      };
      let oid = orderId;
      if (!oid) {
        const res = await orderApi.create(orderData);
        const createdId: unknown = res.data?.data?.id;
        if (res.data?.success !== true || typeof createdId !== 'number' || !Number.isSafeInteger(createdId) || createdId <= 0) {
          throw new Error('创建订单失败，请重试。');
        }
        oid = createdId;
        setPendingOrder({ id: oid, userId: user.id, items: orderedItems });
      }
      if (useStore.getState().token !== token) throw new Error('登录状态已改变，请重新登录后在个人中心查看此订单。');
      // Payment retries reuse the created order instead of creating duplicates.
      const payment = await orderApi.processPayment(oid, paymentMethod);
      if (payment.data?.success !== true || payment.data?.data?.status !== 'PAID') {
        throw new Error('支付未完成，请重试支付。');
      }
      const store = useStore.getState();
      if (store.token !== token) throw new Error('登录状态已改变，请在个人中心查看订单支付结果。');
      // Keep items added from another tab or after a failed payment.
      for (const item of orderedItems) {
        const current = useStore.getState().cart.find(entry => entry.id === item.id);
        if (current) store.updateQuantity(item.id, current.quantity - item.quantity);
      }
      void queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setSuccess(true);
    } catch (err) {
      const message = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined;
      setError(message || (err instanceof Error && !isAxiosError(err) ? err.message : '订单或支付失败，请检查网络后重试。购物车已保留。'));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  if (success) {
    return (
        <div className="bg-white dark:bg-zinc-950">
          <main className="flex items-center justify-center px-4 pt-16">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">订单成功！</h1>
              <p className="mt-2 text-zinc-500">{t('success')}</p>
              <p className="mt-1 text-sm text-zinc-400">支付方式：{paymentMethod} · 测试模式</p>
              <div className="mt-8 flex justify-center gap-4">
                <button
                    onClick={() => router.push('/')}
                    className="rounded-2xl border-2 border-zinc-900 px-6 py-3 font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-white dark:text-white"
                >
                  返回首页
                </button>
                <button
                    onClick={() => router.push('/profile')}
                    className="rounded-2xl bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
                >
                  查看订单
                </button>
              </div>
            </motion.div>
          </main>
        </div>
    );
  }

  return (
      <div className="bg-white dark:bg-zinc-950">
        <main className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-white">{t('title')}</h1>

          {settingsError && <p role="alert" className="mb-4 text-sm text-red-600">无法读取结账设置。<button type="button" onClick={() => { void refetch(); }} className="ml-2 underline">重试</button></p>}
          {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
          {orderId && <p role="status" className="mb-4 text-sm text-zinc-500">订单 {orderId} 已创建，以下为原订单商品。可重试支付或在个人中心查看；后来添加的商品会保留在购物车。</p>}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              {/* Contact */}
              <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-800">
                <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">{t('contactInfo')}</h2>
                <div className="space-y-3">
                  <input
                      value={form.name}
                      disabled={loading || !!orderId}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={t('name')}
                      required
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                  <input
                      value={form.phone}
                      disabled={loading || !!orderId}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder={t('phone')}
                      required
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                  <textarea
                      value={form.address}
                      disabled={loading || !!orderId}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder={t('address')}
                      required
                      rows={3}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Payment */}
              {!loadingSettings && (
                  <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-800">
                    <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">{t('paymentMethod')}</h2>
                    {checkoutEnabled ? (
                        <div className="space-y-2">
                          {([
                            { id: 'WECHAT_PAY', label: t('wechat'), icon: '💚', color: 'border-green-500 bg-green-50 dark:bg-green-900/20' },
                            { id: 'ALIPAY', label: t('alipay'), icon: '💙', color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' },
                            { id: 'PAYPAL', label: t('paypal'), icon: '💛', color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
                          ] as const).map((method) => (
                              <label
                                  key={method.id}
                                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                                      paymentMethod === method.id ? method.color : 'border-zinc-200 dark:border-zinc-700'
                                  }`}
                              >
                                <input
                                    type="radio"
                                    name="payment"
                                    value={method.id}
                                    checked={paymentMethod === method.id}
                                    disabled={loading || !!orderId}
                                    onChange={() => setPaymentMethod(method.id)}
                                    className="hidden"
                                />
                                <span className="text-2xl">{method.icon}</span>
                                <span className="font-medium text-zinc-900 dark:text-white">{method.label}</span>
                                <span className="ml-auto text-xs text-zinc-400">（测试模式）</span>
                              </label>
                          ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Lock className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                          <p className="text-lg font-medium text-zinc-500 dark:text-zinc-400">{t('checkoutDisabled')}</p>
                          <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">{t('contactForPurchase')}</p>
                        </div>
                    )}
                  </div>
              )}
            </div>

            {/* Order Summary */}
            <div>
              <div className="sticky top-24 rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900">
                <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">{t('orderSummary')}</h2>
                <div className="space-y-3">
                  {summaryItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-700">
                          {item.image && <img src={galleryImageUrl(item.image)} alt={item.name} className="h-full w-full object-cover" />}
                        </div>
                        <div className="flex-1 text-sm">
                          <p className="font-medium text-zinc-900 dark:text-white">{item.name}</p>
                          <p className="text-zinc-500">× {item.quantity}</p>
                        </div>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <div className="flex justify-between font-bold text-zinc-900 dark:text-white">
                    <span>总计</span>
                    <span>{formatPrice(summaryItems.reduce((total, item) => total + item.price * item.quantity, 0))}</span>
                  </div>
                </div>
                <button
                    type="submit"
                    disabled={!hydrated || loadingSettings || loading || summaryItems.length === 0 || !checkoutEnabled}
                    className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-semibold text-white transition-all disabled:opacity-50 ${
                        checkoutEnabled
                            ? 'bg-zinc-900 hover:bg-zinc-700 dark:bg-white dark:text-zinc-900'
                            : 'bg-zinc-400 dark:bg-zinc-600 cursor-not-allowed'
                    }`}
                >
                  <CreditCard className="h-5 w-5" />
                  {loading || loadingSettings ? t('processing') : orderId ? '重试支付' : checkoutEnabled ? t('placeOrder') : t('contactForPurchase')}
                </button>
                {!checkoutEnabled && (
                    <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
                      {t('checkoutClosed')}
                    </p>
                )}
              </div>
            </div>
          </form>
        </main>
      </div>
  );
}
