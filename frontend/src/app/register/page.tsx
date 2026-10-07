'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStore } from '@/store';
import { authApi, getApiErrorMessage } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const { setAuth } = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', nickname: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (form.password !== form.confirmPassword) { setError('两次密码不一致'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.register({ username: form.username, email: form.email, password: form.password, nickname: form.nickname });
      if (!res.data.success || !res.data.data?.token) throw new Error('Invalid authentication response');
      const { token, ...user } = res.data.data;
      setAuth(user, token);
      router.push('/');
    } catch (err) {
      setError(getApiErrorMessage(err, '注册失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold text-zinc-900 dark:text-white">XOANA</Link>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">{t('register')}</h1>
        </div>
        <div className="rounded-3xl bg-white p-8 shadow-sm dark:bg-zinc-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'username', label: t('username'), type: 'text' },
              { key: 'nickname', label: t('nickname'), type: 'text' },
              { key: 'email', label: t('email'), type: 'email' },
              { key: 'password', label: t('password'), type: 'password' },
              { key: 'confirmPassword', label: t('confirmPassword'), type: 'password' },
            ].map(field => (
              <div key={field.key}>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  required={field.key !== 'nickname'}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            ))}
            {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-zinc-900 py-3 font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
              {loading ? '注册中...' : t('registerBtn')}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-500">{t('hasAccount')} <Link href="/login" className="font-medium text-violet-600">{t('loginHere')}</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
