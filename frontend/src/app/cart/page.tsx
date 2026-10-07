'use client';

import { galleryImageUrl } from '@/lib/gallery';

import { useLocale, useTranslations } from 'next-intl';
import { useStore } from '@/store';
import { useHydrated } from '@/store/useHydrated';
import Link from 'next/link';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const t = useTranslations('cart');
  const checkoutT = useTranslations('checkout');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const hydrated = useHydrated();
  const { cart, removeFromCart, updateQuantity, cartTotal } = useStore();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">

      <main className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-white">{t('title')}</h1>

        {!hydrated ? <p role="status" className="py-20 text-center text-zinc-500">{commonT('loading')}</p> : cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="mb-4 h-16 w-16 text-zinc-200 dark:text-zinc-700" />
            <p className="mb-6 text-lg text-zinc-500">{t('empty')}</p>
            <Link
              href="/products"
              className="rounded-full bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
            >
              {t('continueShopping')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="mb-4 flex items-center gap-4 rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
                      {item.image ? (
                        <img src={galleryImageUrl(item.image)} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 opacity-70" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-white">{locale === 'en' ? item.nameEn || item.name : item.name}</h3>
                      <p className="text-sm text-zinc-500">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="w-20 text-right font-semibold text-zinc-900 dark:text-white">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                    <button onClick={() => removeFromCart(item.id)} className="text-zinc-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900">
                <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">{checkoutT('orderSummary')}</h2>
                <div className="space-y-2 text-sm">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-zinc-500">
                      <span>{locale === 'en' ? item.nameEn || item.name : item.name} × {item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <div className="flex justify-between font-semibold text-zinc-900 dark:text-white">
                    <span>{t('total')}</span>
                    <span>{formatPrice(cartTotal())}</span>
                  </div>
                </div>
                <Link
                  href="/checkout"
                  className="mt-6 block rounded-2xl bg-zinc-900 px-6 py-4 text-center font-semibold text-white transition-all hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
                >
                  {t('checkout')}
                </Link>
                <Link
                  href="/products"
                  className="mt-3 block text-center text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  {t('continueShopping')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
