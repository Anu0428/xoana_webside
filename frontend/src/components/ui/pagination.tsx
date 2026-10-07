'use client';

import { useTranslations } from 'next-intl';

export function Pagination({ page, totalPages, onChange, disabled = false }: { page: number; totalPages: number; onChange: (page: number) => void; disabled?: boolean }) {
  const t = useTranslations('common');
  if (totalPages <= 1) return null;
  const buttonClass = 'rounded-lg border border-zinc-200 px-4 py-2 text-sm disabled:opacity-40 dark:border-zinc-700';
  return (
    <nav aria-label={t('pagination')} className="mt-6 flex items-center justify-center gap-4">
      <button type="button" disabled={disabled || page === 0} onClick={() => onChange(page - 1)} className={buttonClass}>{t('prev')}</button>
      <span className="text-sm text-zinc-500">{page + 1} / {totalPages}</span>
      <button type="button" disabled={disabled || page >= totalPages - 1} onClick={() => onChange(page + 1)} className={buttonClass}>{t('next')}</button>
    </nav>
  );
}
