'use client';

import { galleryImageUrl } from '@/lib/gallery';

import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Clock, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { articleApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { QueryFeedback } from '@/components/ui/query-feedback';

export function LatestArticles() {
  const t = useTranslations('home.articles');
  const articleT = useTranslations('articles');
  const locale = useLocale();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['recent-articles'],
    queryFn: () => articleApi.getRecent(),
  });

  const articles = data?.data?.data || [];

  return (
    <section className="bg-zinc-50 py-24 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 flex items-end justify-between"
        >
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-zinc-400">
              {t('title')}
            </p>
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white">
              {t('subtitle')}
            </h2>
          </div>
          <Link
            href="/articles"
            className="group hidden items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white sm:flex"
          >
            {t('viewAll')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <QueryFeedback pending={isPending} error={isError} retry={() => { void refetch(); }} />
        {!isPending && !isError && articles.length === 0 && <p className="text-center text-zinc-400">{articleT('noArticles')}</p>}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {articles.slice(0, 3).map((article, i) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-800"
            >
              <Link href={`/articles/${article.id}`}>
                <div className="h-48 overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800">
                  {article.coverImage ? (
                    <img
                      src={galleryImageUrl(article.coverImage)}
                      alt={locale === 'en' ? article.titleEn || article.title : article.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div
                        className="h-16 w-16 rounded-2xl opacity-30"
                        style={{
                          background: `linear-gradient(135deg, hsl(42, 58%, ${Math.max(48, 68 - i * 5)}%), hsl(35, 52%, ${Math.max(30, 48 - i * 4)}%))`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {article.category && (
                    <span className="mb-2 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                      {article.category}
                    </span>
                  )}
                  <h3 className="line-clamp-2 text-lg font-semibold text-zinc-900 transition-colors group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-400">
                  {locale === 'en' ? article.titleEn || article.title : article.title}
                  </h3>
                  {(article.summary || article.summaryEn) && (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {locale === 'en' ? article.summaryEn || article.summary : article.summary}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(article.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {article.viewCount}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
