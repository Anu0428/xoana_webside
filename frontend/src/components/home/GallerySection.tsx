'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import { getGalleryImages, galleryImageUrl } from '@/lib/gallery';

export function GallerySection() {
  const t = useTranslations('home.gallery');

  const { data: settingsData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60 * 1000,
  });

  const s = settingsData?.data?.data || {};
  const galleryImages = getGalleryImages(s);

  return (
    <section id="gallery" className="bg-white py-24 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-gold-600 dark:text-gold-400">
            Gallery
          </p>
          <h2 className="text-4xl font-bold text-zinc-900 dark:text-white">
            {t('title')}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {galleryImages.map((image, index) => (
            <motion.figure
              key={`${image.src}-${index}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: (index % 3) * 0.08 }}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-sm transition-colors hover:border-gold-500/70 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Image
                src={galleryImageUrl(image.src)}
                alt={image.alt}
                fill
                className={`${image.fit === 'contain' ? 'object-contain' : 'object-cover'} transition-transform duration-700 group-hover:scale-[1.025]`}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <figcaption className="pointer-events-none absolute bottom-4 left-4 translate-y-2 text-xs font-semibold uppercase tracking-[0.22em] text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                XOANA / {String(index + 1).padStart(2, '0')}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
