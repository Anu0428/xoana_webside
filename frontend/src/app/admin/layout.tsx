'use client';

import { useStore } from '@/store';
import { useHydrated } from '@/store/useHydrated';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import { LayoutDashboard, Users, Package, FileText, ShoppingBag, BarChart3, Settings, LogOut, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: '仪表盘', icon: LayoutDashboard },
  { href: '/admin/products', label: '产品管理', icon: Package },
  { href: '/admin/articles', label: '文章管理', icon: FileText },
  { href: '/admin/orders', label: '订单管理', icon: ShoppingBag },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/messages', label: '联系消息', icon: MessageSquare },
  { href: '/admin/traffic', label: '流量统计', icon: BarChart3 },
  { href: '/admin/settings', label: '内容设置', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = useStore((state) => state.token);
  const clearAuth = useStore((state) => state.clearAuth);
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const session = useQuery({
    // Bind every authorization result to both the session and the current page.
    queryKey: ['admin-session', token, pathname],
    queryFn: async ({ signal }) => {
      if (!token) throw new Error('Missing session');
      const response = await adminApi.getSession(token, signal);
      if (!response.data.success || response.data.data?.role !== 'ADMIN') {
        throw new Error('Invalid administrator session');
      }
      return response.data.data;
    },
    enabled: hydrated && !!token,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
  const { refetch } = session;
  const status = isAxiosError(session.error) ? session.error.response?.status : undefined;

  useEffect(() => {
    if (!hydrated) return;
    if (session.isError) {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'admin-session',
      });
    }
    if (!token || status === 401) {
      router.replace('/login');
    } else if (status === 403) {
      router.replace('/');
    }
  }, [token, hydrated, status, router, session.isError, queryClient]);

  useEffect(() => {
    if (!hydrated || !token) return;
    const verifyOnFocus = () => { void refetch(); };
    window.addEventListener('focus', verifyOnFocus);
    return () => window.removeEventListener('focus', verifyOnFocus);
  }, [hydrated, token, refetch]);

  // A same-session background check hides the page without losing unsaved forms.
  // New sessions/pages and failed checks never mount the protected subtree.
  const verified = hydrated && !!token && session.isSuccess;
  const authorized = verified && session.fetchStatus === 'idle';
  const verificationFailed = !!token && session.isError && status !== 401 && status !== 403;

  const verificationNotice = (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="text-center">
            {verificationFailed ? (
              <>
                <p role="alert" className="text-sm text-zinc-500">暂时无法验证管理员身份，请稍后重试。</p>
                <button onClick={() => { void refetch(); }} className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-zinc-900">重新验证</button>
                <Link href="/" className="ml-4 text-sm text-zinc-500">返回首页</Link>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                <p role="status" className="text-sm text-zinc-500">正在验证管理员身份...</p>
              </>
            )}
          </div>
        </div>
  );

  if (!verified) return verificationNotice;

  const user = session.data;

  return (
    <>
      {!authorized && verificationNotice}
      <div inert={!authorized} className={cn('min-h-screen bg-zinc-50 dark:bg-zinc-950', authorized ? 'flex' : 'hidden')}>
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-white shadow-sm dark:bg-zinc-900">
          <div className="border-b border-zinc-100 p-6 dark:border-zinc-800">
            <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white">XOANA</Link>
            <p className="mt-0.5 text-xs text-zinc-400">管理后台</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                    <li key={href}>
                      <Link
                          href={href}
                          className={cn(
                              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                              isActive
                                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                          )}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                {user?.nickname?.[0] || 'A'}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{user?.nickname || user?.username}</p>
                <p className="text-xs text-zinc-400">管理员</p>
              </div>
            </div>
            <button
                onClick={() => { clearAuth(); router.replace('/login'); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" /> 退出登录
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="ml-64 flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </>
  );
}

