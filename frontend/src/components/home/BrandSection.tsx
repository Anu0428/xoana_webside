'use client';

import { galleryImageUrl } from '@/lib/gallery';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { NumberTicker } from '@/components/magic';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';

export function BrandSection() {
  const t = useTranslations('home.brand');
  const locale = useLocale();

  const { data: settingsData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60 * 1000,
  });

  const settings = settingsData?.data?.data || {};

  const isEnglish = locale === 'en';

  const stats = [
    {
      value: settings.stat1Value ?? 100,
      label: isEnglish ? (settings.stat1LabelEn || t('stat1Label')) : (settings.stat1Label || t('stat1Label')),
      suffix: '+'
    },
    {
      value: settings.stat2Value ?? 10000,
      label: isEnglish ? (settings.stat2LabelEn || t('stat2Label')) : (settings.stat2Label || t('stat2Label')),
      suffix: '+'
    },
    {
      value: settings.stat3Value ?? 5,
      label: isEnglish ? (settings.stat3LabelEn || t('stat3Label')) : (settings.stat3Label || t('stat3Label')),
      suffix: '+'
    },
  ];

  const displayDescription = isEnglish
      ? (settings.brandDescriptionEn || settings.brandDescription || t('description'))
      : (settings.brandDescription || settings.brandDescriptionEn || t('description'));

  return (
      <section
          id="brand"
          className="bg-white py-24 text-zinc-900 dark:bg-zinc-950 dark:text-white"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
            >
              <p className="mb-4 text-sm font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">
                Brand Story
              </p>

              <h2 className="mb-6 text-5xl font-bold">{t('title')}</h2>

              <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                {displayDescription}
              </p>

              <div className="mt-12 grid grid-cols-3 gap-8">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                    >
                      <div className="text-4xl font-bold text-zinc-900 dark:text-white">
                        <NumberTicker
                            value={stat.value}
                            className="text-zinc-900 dark:text-white"
                        />
                        {stat.suffix}
                      </div>

                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                        {stat.label}
                      </p>
                    </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
            >
              {/* Brand visual */}
              <div className="relative aspect-square overflow-hidden rounded-3xl">
                {settings.brandImage ? (
                    <Image
                        src={galleryImageUrl(settings.brandImage)}
                        alt="About XOANA"
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-blue-700" />

                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[120px] font-black text-white/10">
                      X
                    </span>

                        <div className="absolute bottom-8 left-8 right-8">
                          <p className="text-2xl font-bold text-white">XOANA</p>
                          <p className="text-sm text-white/60">
                            Independent Fingerboard Brand
                          </p>
                        </div>
                      </div>

                      {/* Decorative circles */}
                      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border border-black/10 dark:border-white/10" />
                      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full border border-black/10 dark:border-white/10" />
                    </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
  );
}


