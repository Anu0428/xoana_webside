'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useState } from 'react';
import { contactApi, settingsApi } from '@/lib/api';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

export function ContactSection() {
  const t = useTranslations('home.contact');
  const locale = useLocale();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const { data: settingsData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60 * 1000,
  });

  const settings = settingsData?.data?.data || {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const result = await contactApi.submit({ name: name.trim(), email: email.trim(), message: message.trim() });
      if (result.data?.success !== true) throw new Error('Message was not accepted');
      setSent(true);
    } catch {
      setError(t('error'));
    }
    setSending(false);
  };

  // 根据当前语言环境选择显示中文还是英文地址
  const isEnglish = locale === 'en';
  const displayAddress = isEnglish
      ? (settings.contactAddressEn || settings.contactAddress || 'Shanghai, China')
      : (settings.contactAddress || settings.contactAddressEn || '上海市浦东新区 · 中国');

  return (
      <section className="bg-zinc-50 py-24 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center"
          >
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-400">
              Contact
            </p>
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white">{t('title')}</h2>
            <p className="mt-3 text-zinc-500 dark:text-zinc-400">{t('subtitle')}</p>
          </motion.div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact Info */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
            >
              {[
                { icon: Mail, label: t('email'), value: settings.contactEmail || 'contact@xoana.com' },
                { icon: Phone, label: t('phone'), value: settings.contactPhone || '+86 138 0000 0000' },
                { icon: MapPin, label: t('address'), value: displayAddress },
              ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                      <item.icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{item.label}</p>
                      <p className="text-zinc-900 dark:text-white">{item.value}</p>
                    </div>
                  </div>
              ))}
            </motion.div>

            {/* Contact Form */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
            >
              {sent ? (
                  <div className="flex h-full items-center justify-center rounded-2xl bg-violet-50 p-8 dark:bg-violet-900/20">
                    <p className="text-center text-lg font-medium text-violet-700 dark:text-violet-400">
                      {t('success')}
                    </p>
                  </div>
              ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('namePlaceholder')}
                        required
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        required
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    />
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('messagePlaceholder')}
                        required
                        rows={5}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                    />
                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={sending}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-700"
                    >
                      <Send className="h-4 w-4" />
                      {sending ? t('sending') : t('send')}
                    </button>
                  </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>
  );
}


