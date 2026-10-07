'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { Eye, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { uploadApi } from '@/lib/api';
import { GalleryImage, galleryImageUrl } from '@/lib/gallery';

interface GalleryManagerProps {
  images: GalleryImage[];
  onChange: (update: (images: GalleryImage[]) => GalleryImage[]) => void;
  onBusyChange: (busy: boolean) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  saveError: boolean;
}

export function GalleryManager({ images, onChange, onBusyChange, onSave, saving, saved, saveError }: GalleryManagerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [message, setMessage] = useState('');
  const [failures, setFailures] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');

  const uploadFiles = async (files: File[]) => {
    if (!files.length || uploadLock.current) return;
    uploadLock.current = true;
    onBusyChange(true);
    setFailures([]);
    setMessage('');
    setProgress({ completed: 0, total: files.length });
    const failed: string[] = [];
    let added = 0;
    try {
      // Upload separately so the batch has no image-count/request-size ceiling.
      for (const [index, file] of files.entries()) {
        if (!file.type.startsWith('image/')) {
          failed.push(`${file.name}：请选择图片文件`);
        } else if (file.size > 10 * 1024 * 1024) {
          failed.push(`${file.name}：单张图片不能超过 10 MB`);
        } else {
          try {
            const response = await uploadApi.uploadImage(file);
            const src = response.data?.data;
            if (typeof src !== 'string' || !src) throw new Error('未返回图片地址');
            const image: GalleryImage = { src, alt: file.name, fit: 'cover' };
            onChange(current => [...current, image]);
            added++;
          } catch {
            failed.push(`${file.name}：上传失败，请重新选择此图片重试`);
          }
        }
        setProgress({ completed: index + 1, total: files.length });
      }
      setFailures(failed);
      setMessage(`已添加 ${added} 张图片${failed.length ? `，${failed.length} 张未上传` : ''}。点击“保存设置”后在首页生效。`);
    } finally {
      setProgress(null);
      onBusyChange(false);
      uploadLock.current = false;
    }
  };

  const addUrl = () => {
    const src = imageUrl.trim();
    if (!/^(https?:\/\/|\/(?!\/)).+/.test(src)) {
      setMessage('请输入有效的 http(s) 图片链接或站内图片路径。');
      return;
    }
    onChange(current => [...current, { src, alt: 'XOANA Gallery', fit: 'cover' }]);
    setImageUrl('');
    setMessage('图片已添加，保存设置后在首页生效。');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-900 dark:text-white">当前图片（{images.length} 张）</p>
          <p className="mt-1 text-sm text-zinc-500">图片数量不限，可多选上传。单张最大 10 MB；添加或删除后请保存设置。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
            <Upload className="h-4 w-4" />添加图片
          </button>
          <button type="button" onClick={onSave} className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-zinc-900">
            <Save className="h-4 w-4" />{saving ? '保存中...' : saved ? '已保存！' : '保存设置'}
          </button>
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" aria-label="上传 Gallery 图片"
          onChange={event => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            void uploadFiles(files);
          }} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input type="url" aria-label="Gallery 图片链接" value={imageUrl} onChange={event => setImageUrl(event.target.value)}
          placeholder="也可以粘贴图片 URL 或站内路径" className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
        <button type="button" onClick={addUrl} disabled={!imageUrl.trim()} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-700">
          <Plus className="h-4 w-4" />添加链接
        </button>
      </div>
      <div role="status" aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-300">
        {progress ? `正在上传 ${progress.completed} / ${progress.total} 张，请稍候…` : saved ? 'Gallery 已保存，首页展示已更新。' : message}
      </div>
      {saveError && <p role="alert" className="text-sm text-red-600">保存失败，图片修改仍保留在页面，请重试。</p>}
      {failures.length > 0 && <ul role="alert" className="max-h-40 overflow-y-auto rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        {failures.map((failure, index) => <li key={index}>{failure}</li>)}
      </ul>}
      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">暂无 Gallery 图片，点击“添加图片”开始上传。</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((image, index) => (
            <div key={`${image.src}-${index}`} className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <button type="button" aria-label={`查看图片 ${index + 1}`} className="group relative block aspect-square w-full bg-zinc-50 dark:bg-zinc-800">
                    <Image src={galleryImageUrl(image.src)} alt={image.alt} fill sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw" className={image.fit === 'contain' ? 'object-contain' : 'object-cover'} />
                    <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs text-white"><Eye className="h-4 w-4" />查看大图</span>
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75" />
                  <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-50 w-[88vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 dark:bg-zinc-900">
                    <Dialog.Title className="mb-4 pr-10 font-semibold">Gallery 图片 {index + 1}</Dialog.Title>
                    <div className="relative h-[55vh]"><Image src={galleryImageUrl(image.src)} alt={image.alt} fill sizes="85vw" className="object-contain" /></div>
                    <Dialog.Close aria-label="关闭预览" className="absolute right-4 top-4 rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></Dialog.Close>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">图片 {String(index + 1).padStart(2, '0')}</span>
                  <button type="button" aria-label={`删除图片 ${index + 1}`} onClick={() => {
                    onChange(current => current.filter((_, currentIndex) => currentIndex !== index));
                    setMessage('图片已从 Gallery 移除，保存设置后在首页生效。');
                  }} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 className="h-4 w-4" />删除</button>
                </div>
                <label className="flex items-center justify-between gap-2 text-sm text-zinc-500">
                  展示方式
                  <select aria-label={`图片 ${index + 1} 展示方式`} value={image.fit} onChange={event => {
                    const fit = event.target.value as GalleryImage['fit'];
                    onChange(current => current.map((item, currentIndex) => currentIndex === index ? { ...item, fit } : item));
                  }} className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
                    <option value="cover">铺满卡片</option><option value="contain">完整显示</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
