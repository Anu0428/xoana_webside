'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStore } from '@/store';
import { authApi, getApiErrorMessage } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations('auth');
  const { setAuth } = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(form);
      if (!res.data.success || !res.data.data?.token) throw new Error('Invalid authentication response');
      const { token, ...user } = res.data.data;
      setAuth(user, token);
      router.push(user.role === 'ADMIN' ? '/admin' : '/');
    } catch (err) {
      setError(getApiErrorMessage(err, '登录失败，请检查用户名和密码'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold text-zinc-900 dark:text-white">XOANA</Link>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">{t('login')}</h1>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm dark:bg-zinc-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('username')}</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-10 text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3.5 text-zinc-400">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-zinc-900 py-3 font-semibold text-white transition-all hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
              {loading ? '登录中...' : t('loginBtn')}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm text-zinc-500">
            <p>{t('noAccount')} <Link href="/register" className="font-medium text-violet-600 hover:text-violet-700">{t('registerHere')}</Link></p>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
