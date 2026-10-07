'use client';

import { useTranslations } from 'next-intl';

export function QueryFeedback({ pending, error, retry }: { pending: boolean; error: boolean; retry: () => void }) {
  const t = useTranslations('common');
  if (pending) return <p role="status" className="mb-4 text-sm text-zinc-500">{t('loading')}</p>;
  if (!error) return null;
  return <p role="alert" className="mb-4 text-sm text-red-600">{t('error')} <button type="button" onClick={retry} className="ml-2 underline">{t('retry')}</button></p>;
}
