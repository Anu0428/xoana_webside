'use client';

import { galleryImageUrl } from '@/lib/gallery';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/lib/api';
import { useStore } from '@/store';
import { MagicCard } from '@/components/magic';
import { formatPrice } from '@/lib/utils';
import { SAMPLE_PRODUCTS, type StoreProduct } from '@/lib/sample-products';

const PRODUCTS_PER_PAGE = 4;

export function FeaturedProducts() {
  const t = useTranslations('home.featured');
  const pt = useTranslations('products');
  const locale = useLocale();
  const { addToCart } = useStore();
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const { data } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productApi.getFeatured(),
  });

  const serverProducts: StoreProduct[] = data?.data?.data || [];
  const serverIds = new Set(serverProducts.map((product) => product.id));
  const displayProducts = [
    ...SAMPLE_PRODUCTS.filter((product) => !serverIds.has(product.id)),
    ...serverProducts,
  ];
  const pageCount = Math.max(1, Math.ceil(displayProducts.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const currentProducts = displayProducts.slice(
    currentPage * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE + PRODUCTS_PER_PAGE,
  );

  const goToPage = (nextPage: number) => {
    const wrappedPage = (nextPage + pageCount) % pageCount;
    setDirection(wrappedPage > currentPage || (currentPage === pageCount - 1 && wrappedPage === 0) ? 1 : -1);
    setPage(wrappedPage);
  };

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

    setShowSuccessToast(true);
    window.setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <section className="overflow-hidden bg-white py-24 dark:bg-zinc-950">
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 flex items-end justify-between gap-6"
        >
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-gold-600 dark:text-gold-400">
              {t('title')}
            </p>
            <h2 className="max-w-3xl text-3xl font-bold text-zinc-900 sm:text-4xl dark:text-white">
              {t('subtitle')}
            </h2>
          </div>
          <Link
            href="/products"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-gold-500/40 bg-gold-50 px-4 py-2 text-sm font-semibold text-gold-800 transition-all hover:border-gold-500 hover:bg-gold-100 dark:bg-gold-900/30 dark:text-gold-300"
          >
            {t('viewAll')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              initial={{ opacity: 0, x: direction * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -48 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {currentProducts.map((product) => {
                const displayName = locale === 'en' ? product.nameEn || product.name : product.name;

                return (
                  <MagicCard
                    key={product.id}
                    className="group overflow-hidden border-zinc-200/80 shadow-sm transition-shadow hover:shadow-xl dark:border-zinc-800"
                    gradientColor="#f9edcf"
                  >
                    <Link href={`/products/${product.id}`} aria-label={displayName}>
                      <div className="relative h-64 overflow-hidden bg-white dark:bg-zinc-100">
                        {product.coverImage ? (
                          <img
                            src={galleryImageUrl(product.coverImage)}
                            alt={displayName}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-gold-400 to-gold-700 text-white">
                            <span className="text-3xl font-bold">X</span>
                          </div>
                        )}
                        <span className="absolute left-3 top-3 rounded-full border border-black/5 bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-700 backdrop-blur-sm">
                          {product.category || 'XOANA'}
                        </span>
                        <span className="absolute bottom-3 right-3 translate-y-2 rounded-full bg-black/80 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-all group-hover:translate-y-0 group-hover:opacity-100">
                          {locale === 'en' ? 'View details' : '查看详情'}
                        </span>
                      </div>
                    </Link>

                    <div className="relative p-4">
                      <Link href={`/products/${product.id}`}>
                        <h3 className="line-clamp-1 font-semibold text-zinc-900 transition-colors hover:text-gold-700 dark:text-white dark:hover:text-gold-400">
                          {displayName}
                        </h3>
                      </Link>
                      {product.demoOnly && <p className="mt-1 text-xs text-zinc-500">{locale === 'en' ? 'Display sample' : '展示样品'}</p>}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-lg font-bold text-zinc-900 dark:text-white">
                          {formatPrice(product.price)}
                        </span>
                        <button
                          type="button"
                          disabled={product.demoOnly || product.stock <= 0}
                          onClick={() => handleAddToCart(product)}
                          className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-gold-300"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {pt('addToCart')}
                        </button>
                      </div>
                    </div>
                  </MagicCard>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            aria-label={locale === 'en' ? 'Previous products' : '上一组产品'}
            className="grid h-11 w-11 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-sm transition-all hover:border-gold-500 hover:bg-gold-50 hover:text-gold-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:border-gold-500"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2" aria-label={`${currentPage + 1} / ${pageCount}`}>
            {Array.from({ length: pageCount }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToPage(index)}
                aria-label={`${locale === 'en' ? 'Go to page' : '跳转到第'} ${index + 1}`}
                className={`h-2 rounded-full transition-all ${
                  index === currentPage ? 'w-7 bg-gold-500' : 'w-2 bg-zinc-300 hover:bg-gold-300 dark:bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            aria-label={locale === 'en' ? 'Next products' : '下一组产品'}
            className="grid h-11 w-11 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-sm transition-all hover:border-gold-500 hover:bg-gold-50 hover:text-gold-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:border-gold-500"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
