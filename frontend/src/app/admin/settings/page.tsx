'use client';

import { useState, useEffect } from 'react';
import { uploadApi, settingsApi } from '@/lib/api';
import { GalleryManager } from '@/components/admin/GalleryManager';
import { GalleryImage, getGalleryImages, galleryImageUrl } from '@/lib/gallery';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Image as ImageIcon, Upload, Download, Upload as UploadIcon } from 'lucide-react';

interface SiteSettings {
  // 基本信息 - Basic Info
  siteName: string;
  siteNameEn: string;
  siteDescription: string;
  siteDescriptionEn: string;

  // Hero 区域
  heroTitle: string;
  heroTitleEn: string;
  heroSubtitle: string;
  heroSubtitleEn: string;
  heroDescription: string;
  heroDescriptionEn: string;

  // 品牌介绍
  brandDescription: string;
  brandDescriptionEn: string;
  brandImage: string;

  // Gallery
  galleryImages: GalleryImage[];

  // 联系信息
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactAddressEn: string;
  wechatQR: string;

  // 结账设置 - Checkout Settings
  checkoutEnabled: boolean;

  // 品牌统计数据
  stat1Value: number;
  stat1Label: string;
  stat1LabelEn: string;
  stat2Value: number;
  stat2Label: string;
  stat2LabelEn: string;
  stat3Value: number;
  stat3Label: string;
  stat3LabelEn: string;
}

const defaultSettings: SiteSettings = {
  // 基本信息
  siteName: 'XOANA',
  siteNameEn: 'XOANA',
  siteDescription: '独立手指滑板品牌',
  siteDescriptionEn: 'Independent Fingerboard Brand',

  // Hero 区域
  heroTitle: 'XOANA 指板',
  heroTitleEn: 'Fingerboard',
  heroSubtitle: '极致工艺，专注品质',
  heroSubtitleEn: 'Craftsmanship & Quality',
  heroDescription: '每一块指板都是独立手工打造，融合传统技艺与现代设计',
  heroDescriptionEn: 'Each fingerboard is handcrafted independently, blending traditional craftsmanship with modern design.',

  // 品牌介绍
  brandDescription: 'XOANA 是一个专注于独立手指滑板的品牌，我们致力于为每一位玩家带来最高品质的产品体验。',
  brandDescriptionEn: 'XOANA is an independent fingerboard brand dedicated to providing the highest quality products for every player.',
  brandImage: '',

  // Gallery
  galleryImages: [],

  // 联系信息
  contactEmail: 'contact@xoana.com',
  contactPhone: '+86 138 0000 0000',
  contactAddress: '上海市浦东新区 · 中国',
  contactAddressEn: 'Pudong New Area, Shanghai · China',
  wechatQR: '',

  // 结账设置
  checkoutEnabled: true,

  // 品牌统计数据
  stat1Value: 100,
  stat1Label: '款式设计',
  stat1LabelEn: 'Design Styles',
  stat2Value: 10000,
  stat2Label: '满意客户',
  stat2LabelEn: 'Satisfied Customers',
  stat3Value: 5,
  stat3Label: '年品牌历史',
  stat3LabelEn: 'Years of Brand History',
};

type FieldDef = {
  key: keyof SiteSettings;
  label: string;
  textarea?: boolean;
  image?: boolean;
};

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  { title: '基本信息 (Basic Info)', fields: [
      { key: 'siteName', label: '网站名称（中文）' },
      { key: 'siteNameEn', label: 'Website Name (English)' },
      { key: 'siteDescription', label: '网站描述（中文）', textarea: true },
      { key: 'siteDescriptionEn', label: 'Website Description (English)', textarea: true },
    ]},
  { title: '首页 Hero 区域', fields: [
      { key: 'heroTitle', label: 'Hero 标题（中文）' },
      { key: 'heroTitleEn', label: 'Hero Title (English)' },
      { key: 'heroSubtitle', label: 'Hero 副标题（中文）' },
      { key: 'heroSubtitleEn', label: 'Hero Subtitle (English)' },
      { key: 'heroDescription', label: 'Hero 描述（中文）', textarea: true },
      { key: 'heroDescriptionEn', label: 'Hero Description (English)', textarea: true },
    ]},
  { title: '品牌介绍 (About XOANA)', fields: [
      { key: 'brandDescription', label: '品牌描述（中文）', textarea: true },
      { key: 'brandDescriptionEn', label: 'Brand Description (English)', textarea: true },
      { key: 'brandImage', label: '品牌图片 URL', image: true },
    ]},
  { title: '品牌统计数据 (Brand Stats)', fields: [
      { key: 'stat1Value', label: '统计 1 数值' },
      { key: 'stat1Label', label: '统计 1 标签（中文）' },
      { key: 'stat1LabelEn', label: 'Stat 1 Label (English)' },
      { key: 'stat2Value', label: '统计 2 数值' },
      { key: 'stat2Label', label: '统计 2 标签（中文）' },
      { key: 'stat2LabelEn', label: 'Stat 2 Label (English)' },
      { key: 'stat3Value', label: '统计 3 数值' },
      { key: 'stat3Label', label: '统计 3 标签（中文）' },
      { key: 'stat3LabelEn', label: 'Stat 3 Label (English)' },
    ]},
  { title: '产品展示 (Gallery)', fields: [] },
  { title: '联系信息 (Contact)', fields: [
      { key: 'contactEmail', label: '联系邮箱' },
      { key: 'contactPhone', label: '联系电话' },
      { key: 'contactAddress', label: '地址（中文）' },
      { key: 'contactAddressEn', label: 'Address (English)' },
      { key: 'wechatQR', label: '微信二维码 URL', image: true },
    ]},
  { title: '结账设置 (Checkout)', fields: [
      { key: 'checkoutEnabled', label: '启用在线结账功能' },
    ]},

];


export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Load settings from API
  const { data: apiSettings, isPending: loading, isError: loadError, refetch } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => settingsApi.get(),
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: (data: SiteSettings) => settingsApi.update(data as unknown as Record<string, unknown>),
    onSuccess: (response) => {
      qc.setQueryData(['site-settings'], response);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // Apply API settings when loaded
  useEffect(() => {
    if (apiSettings?.data?.data) {
      const remote = apiSettings.data.data;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings({ ...defaultSettings, ...remote, galleryImages: getGalleryImages(remote) });
    }
  }, [apiSettings]);

  const handleImageUpload = async (key: keyof SiteSettings, file: File) => {
    setUploading(key);
    try {
      const res = await uploadApi.uploadImage(file);
      const url = galleryImageUrl(res.data.data);

      if (url) setSettings(s => ({ ...s, [key]: url }));
    } catch { alert('上传失败'); }
    setUploading(null);
  };

  const handleSave = () => {
    // Save to database via API
    saveMutation.mutate(settings);
  };

  // 导出设置为 JSON 文件
  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xoana-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 导入设置从 JSON 文件
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!imported || typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Settings must be an object');

        if (confirm('导入设置将覆盖当前所有配置，确定要继续吗？')) {
          setSettings({ ...defaultSettings, ...imported, galleryImages: getGalleryImages(imported) });
          setSaved(false);
          alert('设置已导入，请点击保存设置以生效。');
        }
      } catch (err) {
        alert('导入失败：文件格式不正确');
        console.error('Import error:', err);
      }
    };
    input.click();
  };

  const handleToggleChange = (key: keyof SiteSettings) => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  };

  return (
      <div>
        {loadError && <div role="alert" className="mb-4 text-red-600">设置加载失败。<button type="button" onClick={() => refetch()} className="ml-2 underline">重试</button></div>}
        {saveMutation.isError && <p role="alert" className="mb-4 text-red-600">保存失败，修改仍保留在页面，请重试。</p>}
        {loading && <p role="status" className="mb-4 text-zinc-500">正在加载设置…</p>}
        <fieldset disabled={loading || loadError || !!uploading || saveMutation.isPending} className="min-w-0 disabled:opacity-70">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">内容设置</h1>
          <div className="flex gap-2">
            <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <Download className="h-4 w-4" />
              导出设置
            </button>
            <button
                onClick={handleImport}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <UploadIcon className="h-4 w-4" />
              导入设置
            </button>
            <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? '保存中...' : saved ? '已保存！' : '保存设置'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {SECTIONS.map(section => (
              <div key={section.title} className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
                <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">{section.title}</h2>
                {section.title === '产品展示 (Gallery)' && (
                  <GalleryManager
                    images={settings.galleryImages}
                    onChange={update => {
                      setSaved(false);
                      setSettings(current => ({ ...current, galleryImages: update(current.galleryImages) }));
                    }}
                    onBusyChange={busy => setUploading(busy ? 'gallery' : null)}
                    onSave={handleSave}
                    saving={saveMutation.isPending}
                    saved={saved}
                    saveError={saveMutation.isError}
                  />
                )}
                <div className="space-y-4">
                  {section.fields.map(field => (
                      <div key={field.key}>
                        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {field.image && <ImageIcon className="h-4 w-4 text-zinc-400" />}
                          {field.label}
                        </label>
                        {field.textarea ? (
                            <textarea
                                value={String(settings[field.key] ?? '')}
                                onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                                rows={3}
                                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                        ) : field.image ? (
                            <div className="flex gap-2">
                              <input
                                  type="text"
                                  value={String(settings[field.key] ?? '')}
                                  onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                                  placeholder="https://... 或点击上传"
                                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                              />
                              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                <Upload className="h-4 w-4" />
                                {uploading === field.key ? '上传中...' : '上传图片'}
                                <input type="file" accept="image/*" className="hidden"
                                       onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(field.key, f); }} />
                              </label>
                            </div>
                        ) : field.key === 'checkoutEnabled' ? (
                            <button
                                onClick={() => handleToggleChange(field.key)}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                    settings[field.key] ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'
                                }`}
                            >
                              <span
                                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                      settings[field.key] ? 'translate-x-7' : 'translate-x-1'
                                  }`}
                              />

                            </button>
                        ) : (
                            <input
                                type="text"
                                value={String(settings[field.key] ?? '')}
                                onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                        )}
                        {/* Image preview - only render on client */}
                        {field.image && typeof settings[field.key] === 'string' && settings[field.key] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={settings[field.key] as string}
                                alt="preview"
                                className="mt-2 h-24 w-auto rounded-lg object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        )}
                      </div>
                  ))}
                </div>
              </div>
          ))}
        </div>
        </fieldset>
      </div>
  );
}
