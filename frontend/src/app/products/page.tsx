'use client';

import { galleryImageUrl } from '@/lib/gallery';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/lib/api';
import Link from 'next/link';
import { Search, ShoppingCart, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { formatPrice } from '@/lib/utils';
import { MagicCard } from '@/components/magic';
import { useLocale } from 'next-intl';
import { SAMPLE_PRODUCTS, type StoreProduct } from '@/lib/sample-products';
import { QueryFeedback } from '@/components/ui/query-feedback';

const CATEGORIES = ['全部', 'deck', 'wheel', 'truck', ];

export default function ProductsPage() {
    const t = useTranslations('products');
    const locale = useLocale();
    const { addToCart } = useStore();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('全部');
    const [page, setPage] = useState(0);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['products', page, category, search],
        queryFn: () =>
            productApi.getAll({
                page,
                size: 12,
                category: category !== '全部' ? category : undefined,
                keyword: search || undefined,
            }),
    });

    const serverProducts: StoreProduct[] = data?.data?.data?.content || [];
    const totalPages: number = data?.data?.data?.totalPages || 1;
    const serverIds = new Set(serverProducts.map((product) => product.id));
    const localProducts = SAMPLE_PRODUCTS.filter((product) => {
        const matchCategory = category === '全部' || product.category === category;
        const searchableName = `${product.name} ${product.nameEn || ''}`.toLowerCase();
        const matchSearch = !search || searchableName.includes(search.toLowerCase());
        return matchCategory && matchSearch && !serverIds.has(product.id);
    });
    const products = [
        ...(page === 0 ? localProducts : []),
        ...serverProducts,
    ];

    const handleAddToCart = (product: StoreProduct) => {
        if (product.demoOnly || product.stock <= 0) return;
        addToCart({
            id: product.id,
            name: product.name,
            nameEn: product.nameEn,
            price: product.price,
            quantity: 1,
            image: product.coverImage,
        });

        // 显示成功提示
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    return (
        <div className="bg-white dark:bg-zinc-950">
            {/* Success Toast */}
            <AnimatePresence>
                {showSuccessToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 20, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="fixed left-1/2 top-0 z-50 flex items-center gap-3 rounded-full bg-gold-600 px-6 py-3 text-white shadow-lg"
                    >
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">
              {locale === 'en' ? 'Added to cart!' : '已成功添加到购物车'}
            </span>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">{t('title')}</h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t('subtitle')}</p>
                </div>

                {/* Filters */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder={t('search')}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => {
                                    setCategory(cat);
                                    setPage(0);
                                }}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                                    category === cat
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                                }`}
                            >
                                {cat === '全部' ? t('filter.all') : cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Products Grid */}
                <QueryFeedback pending={false} error={isError} retry={() => { void refetch(); }} />
                {isLoading && products.length === 0 ? (
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="py-20 text-center text-zinc-400">{t('noProducts')}</div>
                ) : (
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                        {products.map((product, i) => {
                            const displayName = locale === 'en' ? product.nameEn || product.name : product.name;

                            return (
                            <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <MagicCard className="group overflow-hidden" gradientColor="#f4f4f5">
                                    <Link href={`/products/${product.id}`} aria-label={displayName}>
                                        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
                                            {product.coverImage ? (
                                                <img
                                                    src={galleryImageUrl(product.coverImage)}
                                                    alt={displayName}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center">
                                                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 opacity-70" />
                                                </div>
                                            )}
                                            {product.stock <= 3 && product.stock > 0 && (
                                                <span className="absolute right-2 top-2 rounded-full bg-orange-500 px-2 py-0.5 text-xs font-medium text-white">
                          仅剩{product.stock}件
                        </span>
                                            )}
                                            {product.stock === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                    <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-zinc-700">{t('outOfStock')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </Link>

                                    <div className="p-4">
                                        {product.category && <span className="mb-1 block text-xs text-zinc-400">{product.category}</span>}
                                        <Link href={`/products/${product.id}`}>
                                            <h3 className="line-clamp-1 font-semibold text-zinc-900 dark:text-white">{displayName}</h3>
                                        </Link>
                                        {product.demoOnly && <p className="mt-1 text-xs text-zinc-500">{locale === 'en' ? 'Display sample' : '展示样品'}</p>}

                                        <div className="mt-3 flex items-center justify-between">
                                            <span className="font-bold text-zinc-900 dark:text-white">{formatPrice(product.price)}</span>
                                            <button
                                                disabled={product.demoOnly || product.stock <= 0}
                                                onClick={() => handleAddToCart(product)}
                                                className="flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                                            >
                                                <ShoppingCart className="h-3 w-3" />
                                                {t('addToCart')}
                                            </button>
                                        </div>
                                    </div>
                                </MagicCard>
                            </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="rounded-full bg-zinc-100 px-4 py-1.5 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        >
                            {t('pagination.prev')}
                        </button>
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i)}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                                    page === i
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="rounded-full bg-zinc-100 px-4 py-1.5 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        >
                            {t('pagination.next')}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
