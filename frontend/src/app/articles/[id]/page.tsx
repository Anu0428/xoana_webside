'use client';

import { galleryImageUrl } from '@/lib/gallery';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { articleApi } from '@/lib/api';
import { Clock, Eye, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import { useLocale } from 'next-intl';

export default function ArticleDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const locale = useLocale();
    const id = Number(params.id);

    const { data, isLoading, error } = useQuery({
        queryKey: ['article', id],
        queryFn: () => articleApi.getById(id),
        enabled: Number.isSafeInteger(id) && id > 0,
    });

    const article = data?.data?.data;

    // 处理加载状态
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                    <p className="text-sm text-zinc-500">加载中...</p>
                </div>
            </div>
        );
    }

    // 处理错误情况
    if (error || !article) {
        return (
            <div className="bg-white dark:bg-zinc-950">
                <main className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
                    <button
                        onClick={() => router.back()}
                        className="mb-8 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" /> 返回
                    </button>
                    <div className="py-16 text-center">
                        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">文章未找到</h1>
                        <p className="text-zinc-500 dark:text-zinc-400">抱歉，您查看的文章不存在或已被删除。</p>
                        <button
                            onClick={() => router.push('/articles')}
                            className="mt-6 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
                        >
                            返回文章列表
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // 根据语言环境选择显示中文还是英文内容
    const isEnglish = locale === 'en';
    const displayTitle = isEnglish ? (article.titleEn || article.title) : article.title;
    const displayContent = (isEnglish ? (article.contentEn || article.content) : article.content) || '';

    return (
        <div className="bg-white dark:bg-zinc-950">
            <main className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6">
                <button
                    onClick={() => router.back()}
                    className="mb-8 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" /> 返回
                </button>

                <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {article.category && (
                        <span className="mb-4 inline-block rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              {article.category}
            </span>
                    )}

                    <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">{displayTitle}</h1>

                    <div className="mt-4 flex items-center gap-4 text-sm text-zinc-400">
                        {article.author && <span>{article.author}</span>}
                        <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
                            {formatDate(article.createdAt)}
            </span>
                        <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
                            {article.viewCount} 次阅读
            </span>
                    </div>

                    {article.coverImage && (
                        <div className="mt-8 overflow-hidden rounded-2xl">
                            <img src={galleryImageUrl(article.coverImage)} alt={displayTitle} className="w-full object-cover" />
                        </div>
                    )}

                    <div
                        className="prose prose-zinc mt-8 max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: displayContent }}
                    />
                </motion.article>
            </main>
        </div>
    );
}
