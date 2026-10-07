'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Particles } from '@/components/magic';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';

export function HeroSection() {
    const t = useTranslations('home.hero');
    const locale = useLocale();

    const { data: settingsData } = useQuery({
        queryKey: ['site-settings'],
        queryFn: () => settingsApi.get(),
        staleTime: 5 * 60 * 1000,
    });

    const settings = settingsData?.data?.data || {};

    const handleLearnMoreClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();

        const el = document.getElementById('brand');
        if (!el) return;

        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // 根据当前语言环境选择显示中文还是英文
    const isEnglish = locale === 'en';
    const displayTitle = isEnglish
        ? (settings.heroTitleEn || settings.heroTitle?.replace('XOANA ', '') || t('title').replace('XOANA ', ''))
        : (settings.heroTitle?.replace('XOANA ', '') || t('title').replace('XOANA ', ''));

    const displaySubtitle = isEnglish
        ? (settings.heroSubtitleEn || settings.heroSubtitle || t('subtitle'))
        : (settings.heroSubtitle || settings.heroSubtitleEn || t('subtitle'));

    const displayDescription = isEnglish
        ? (settings.heroDescriptionEn || settings.heroDescription || t('description'))
        : (settings.heroDescription || settings.heroDescriptionEn || t('description'));

    return (
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white dark:bg-zinc-950">
            <Particles quantity={80} />

            {/* Background gradient */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-500/15 via-purple-500/15 to-blue-500/15 blur-3xl dark:from-violet-500/20 dark:via-purple-500/20 dark:to-blue-500/20" />
            </div>

            <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >

                    <h1 className="mb-6 text-6xl font-bold tracking-tight text-zinc-900 md:text-8xl dark:text-white">
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900/60 bg-clip-text text-transparent dark:from-white dark:via-white dark:to-white/60">
              XOANA
            </span>
                        <br />
                        <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-purple-400 dark:to-blue-400">
              {displayTitle}
            </span>
                    </h1>

                    <p className="mx-auto mb-4 max-w-2xl text-xl font-light text-zinc-700 dark:text-white/60">
                        {displaySubtitle}
                    </p>
                    <p className="mx-auto mb-10 max-w-xl text-base text-zinc-500 dark:text-white/40">
                        {displayDescription}
                    </p>

                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link
                            href="/products"
                            className="group flex items-center gap-2 rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-zinc-800 hover:shadow-xl dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                        >
                            {t('shopNow')}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>

                        {/* Smooth scroll */}
                        <Link
                            href="#brand"
                            onClick={handleLearnMoreClick}
                            className="flex items-center gap-2 rounded-full border border-zinc-900/20 px-8 py-4 text-base font-medium text-zinc-900 backdrop-blur-sm transition-all hover:bg-zinc-900/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                        >
                            {t('learnMore')}
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Scroll hint */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <motion.a
                    href="#brand"
                    onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById('brand');
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    aria-label="Scroll down to Brand section"
                    className="group flex flex-col items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-white/50 dark:hover:text-white"
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                >
          <span className="text-xs font-medium tracking-widest">
            向下滑动
          </span>
                    <ChevronDown className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
                </motion.a>
            </motion.div>
        </section>
    );
}

