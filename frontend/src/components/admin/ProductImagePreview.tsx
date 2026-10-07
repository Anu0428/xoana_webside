'use client';

import { useState } from 'react';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { ImageOff, X, ZoomIn } from 'lucide-react';

interface ProductImagePreviewProps {
  src?: string;
  name: string;
  productId?: number;
  className?: string;
}

export function ProductImagePreview({ src, ...props }: ProductImagePreviewProps) {
  const imagePath = src?.trim() || '';
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
  const imageUrl = imagePath.startsWith('/uploads/')
    ? `${backendUrl.replace(/\/$/, '')}${imagePath}`
    : imagePath;

  // A new image URL gets a fresh load attempt after an upload or edit.
  return <ProductImagePreviewContent key={imageUrl} src={imageUrl} {...props} />;
}

function ProductImagePreviewContent({ src, name, productId, className = 'h-16 w-16' }: ProductImagePreviewProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const canPreview = !!src && !imageFailed;
  const placeholder = src ? '图片不可用' : '暂无图片';

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          disabled={!canPreview}
          aria-label={canPreview ? `查看 ${name} 的大图` : `${name}：${placeholder}`}
          title={canPreview ? '点击查看大图' : placeholder}
          className={`group relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 transition-colors enabled:cursor-zoom-in enabled:hover:border-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
        >
          {canPreview ? (
            <>
              <Image src={src!} alt={`${name} 封面`} fill sizes="96px" unoptimized className="object-contain p-1" onError={() => setImageFailed(true)} />
              <span className="absolute bottom-0.5 right-0.5 rounded-md bg-black/60 p-1 text-white" aria-hidden="true"><ZoomIn className="h-3 w-3" /></span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-1 text-zinc-400">
              <ImageOff className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px]">{placeholder}</span>
            </span>
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/75" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl focus:outline-none dark:bg-zinc-900">
          <Dialog.Title className="break-words pr-12 text-lg font-semibold text-zinc-900 dark:text-white">{name}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-zinc-500">
            {productId !== undefined ? `产品编号 #${productId} · ` : ''}封面预览
          </Dialog.Description>
          <div className="relative mt-4 flex h-[60vh] max-h-[600px] items-center justify-center overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-800">
            {canPreview ? (
              <Image src={src!} alt={`${name} 大图`} fill sizes="(max-width: 768px) 90vw, 728px" unoptimized className="object-contain" onError={() => setImageFailed(true)} />
            ) : <p className="text-sm text-zinc-500">{placeholder}</p>}
          </div>
          <Dialog.Close aria-label="关闭图片预览" className="absolute right-4 top-4 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-violet-500 dark:hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
