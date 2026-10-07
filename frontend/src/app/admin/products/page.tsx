'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { productApi, uploadApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Plus, Edit, Trash2, X, Upload, Download, Upload as UploadIcon, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductImagePreview } from '@/components/admin/ProductImagePreview';
import type { Product } from '@/types/models';
import { Pagination } from '@/components/ui/pagination';
import { QueryFeedback } from '@/components/ui/query-feedback';
import { galleryImageUrl } from '@/lib/gallery';

interface ProductForm {
  name: string;
  nameEn: string;
  price: string;
  stock: string;
  category: string;
  description: string;
  descriptionEn: string;
  material: string;
  dimensions: string;
  coverImage: string;
  featured: boolean;
  active: boolean;
}

const defaultForm: ProductForm = { name: '', nameEn: '', price: '', stock: '', category: '', description: '', descriptionEn: '', material: '', dimensions: '', coverImage: '', featured: false, active: true };

// 产品分类选项
const CATEGORIES = [
  { value: '', label: '请选择分类' },
  { value: 'deck', label: 'Deck' },
  { value: 'wheel', label: 'Wheel' },
  { value: 'truck', label: 'Truck' },
];

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [page, setPage] = useState(0);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin-products', page],
    queryFn: async () => {
      const res = await productApi.getAllForAdmin({ page, size: 20 });
      return res.data;
    },
  });

  const products = data?.data.content || [];


  const createMutation = useMutation({
    mutationFn: (data: unknown) => editId ? productApi.update(editId, data) : productApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-products'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['featured-products'] });
      void qc.invalidateQueries({ queryKey: ['product'] });
      setShowForm(false); setForm(defaultForm); setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (product: Product) => productApi.delete(product.id),
    onMutate: () => setDeleteFeedback(null),
    onSuccess: async (_, product) => {
      if (products.length === 1 && page > 0) setPage(page - 1);
      qc.removeQueries({ queryKey: ['product', product.id], exact: true });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin-products'] }),
        qc.invalidateQueries({ queryKey: ['products'] }),
        qc.invalidateQueries({ queryKey: ['featured-products'] }),
        qc.invalidateQueries({ queryKey: ['admin-stats'] }),
      ]);
      setDeleteFeedback({ type: 'success', message: `已删除产品“${product.name}”（#${product.id}）。` });
    },
    onError: (error, product) => {
      const responseMessage = isAxiosError(error) ? error.response?.data?.message : undefined;
      const message = typeof responseMessage === 'string' ? responseMessage : '请稍后重试';
      setDeleteFeedback({ type: 'error', message: `删除产品“${product.name}”（#${product.id}）失败：${message}` });
    },
  });

  const handleDelete = (product: Product) => {
    if (deleteMutation.isPending) return;
    if (confirm(`确认删除产品“${product.name}”（#${product.id}）？删除后将从产品管理和商城中移除，历史订单仍会保留。`)) {
      deleteMutation.mutate(product);
    }
  };

  const handleEdit = (product: Product) => {
    setEditId(product.id);
    setForm({ name: product.name, nameEn: product.nameEn || '', price: String(product.price), stock: String(product.stock), category: product.category || '', description: product.description || '', descriptionEn: product.descriptionEn || '', material: product.material || '', dimensions: product.dimensions || '', coverImage: product.coverImage || '', featured: product.featured, active: product.active });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, price: Number(form.price), stock: Number(form.stock) });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      const imageUrl = galleryImageUrl(res.data.data);

      setForm(f => ({ ...f, coverImage: imageUrl }));
    } catch (err) {
      const response = isAxiosError(err) ? err.response : undefined;
      const message = response?.data?.message || response?.data?.error || '上传失败';
      alert(message);

    } finally {
      setUploading(false);
    }
  };

  const handleExport = () => {
    const exportData = products.map((p) => ({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      price: p.price,
      stock: p.stock,
      category: p.category,
      description: p.description,
      descriptionEn: p.descriptionEn,
      material: p.material,
      dimensions: p.dimensions,
      coverImage: p.coverImage,
      featured: p.featured,
      active: p.active,
      createdAt: p.createdAt,
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xoana-products-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

        if (!Array.isArray(imported)) {
          alert('文件格式不正确：应为产品数组');
          return;
        }

        if (confirm(`确定要导入 ${imported.length} 个产品吗？这将批量创建新产品。`)) {
          let successCount = 0;
          let failCount = 0;

          for (const product of imported) {
            try {
              await productApi.create({
                name: product.name,
                nameEn: product.nameEn,
                price: product.price,
                stock: product.stock,
                category: product.category,
                description: product.description,
                descriptionEn: product.descriptionEn,
                material: product.material,
                dimensions: product.dimensions,
                coverImage: product.coverImage,
                featured: product.featured,
                active: product.active,
              });
              successCount++;
            } catch (err) {
              console.error('导入产品失败:', product.name, err);
              failCount++;
            }
          }

          alert(`导入完成！成功：${successCount}, 失败：${failCount}`);
          qc.invalidateQueries({ queryKey: ['admin-products'] });
        }
      } catch (err) {
        alert('导入失败：文件格式不正确');
        console.error('Import error:', err);
      }
    };
    input.click();
  };

  return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">产品管理</h1>
          <div className="flex gap-2">
            <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <Download className="h-4 w-4" />
              导出本页产品
            </button>
            <button
                onClick={handleImport}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <UploadIcon className="h-4 w-4" />
              导入产品
            </button>
            <button
                onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
            >
              <Plus className="h-4 w-4" /> 添加产品
            </button>
          </div>
        </div>

        {deleteFeedback && (
          <p
            role={deleteFeedback.type === 'error' ? 'alert' : 'status'}
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${deleteFeedback.type === 'error'
              ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
              : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'}`}
          >
            {deleteFeedback.message}
          </p>
        )}
        <QueryFeedback pending={isPending} error={isError} retry={() => { void refetch(); }} />
        {createMutation.isError && <p role="alert" className="mb-4 text-sm text-red-600">保存产品失败，修改仍保留，请重试。</p>}

        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              {['产品', '价格', '库存', '分类', '状态', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500">{h}</th>
              ))}
            </tr>
            </thead>
            <tbody>
            {products.length === 0 && !isPending && !isError ? (
                <tr><td colSpan={6} className="py-12 text-center text-zinc-400">暂无产品，点击上方按钮添加</td></tr>
            ) : products.map((p) => (
                <tr key={p.id} className="border-b border-zinc-50 dark:border-zinc-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductImagePreview src={p.coverImage || p.images?.[0]} name={p.name} productId={p.id} />
                      <div className="min-w-0">
                        <p className="break-words font-medium text-zinc-900 dark:text-white">{p.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">#{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3"><span className={p.stock > 0 ? 'text-green-600' : 'text-red-500'}>{p.stock}</span></td>
                  <td className="px-4 py-3 text-zinc-500">{p.category}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${p.active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>{p.active ? '上架' : '下架'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button aria-label={`编辑 ${p.name}`} onClick={() => handleEdit(p)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><Edit className="h-4 w-4" /></button>
                      <button
                        aria-label={deleteMutation.isPending && deleteMutation.variables?.id === p.id ? `正在删除 ${p.name}` : `删除 ${p.name}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(p)}
                        className="flex items-center gap-1 rounded-lg p-1.5 text-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20"
                      >
                        {deleteMutation.isPending && deleteMutation.variables?.id === p.id
                          ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="whitespace-nowrap text-xs">删除中...</span></>
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={data?.data.totalPages ?? 0} onChange={setPage} disabled={isPending} />
        <AnimatePresence>
          {showForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-2xl overflow-auto rounded-3xl bg-white p-8 shadow-2xl dark:bg-zinc-900" style={{ maxHeight: '90vh' }}>
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{editId ? '编辑产品' : '添加产品'}</h2>
                    <button aria-label="关闭产品表单" onClick={() => setShowForm(false)}><X className="h-5 w-5 text-zinc-500" /></button>
                  </div>
                  {editId !== null && (
                    <div className="mb-6 flex items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
                      <ProductImagePreview src={form.coverImage || products.find(product => product.id === editId)?.images?.[0]} name={form.name || '当前产品'} productId={editId} />
                      <div className="min-w-0">
                        <p className="break-words font-medium text-zinc-900 dark:text-white">{form.name || '未命名产品'}</p>
                        <p className="mt-1 text-xs text-zinc-500">正在编辑产品 #{editId}</p>
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'name', label: '产品名（中文）', required: true },
                      { key: 'nameEn', label: '产品名（英文）' },
                      { key: 'price', label: '价格（元）', type: 'number', required: true },
                      { key: 'stock', label: '库存', type: 'number', required: true },
                      { key: 'material', label: '材质' },
                      { key: 'dimensions', label: '尺寸' },
                    ].map(f => (
                        <div key={f.key} className={f.key === 'name' || f.key === 'nameEn' ? 'col-span-1' : 'col-span-1'}>
                          <label htmlFor={`product-${f.key}`} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{f.label}</label>
                          <input id={`product-${f.key}`} type={f.type || 'text'} required={f.required} value={form[f.key as keyof ProductForm] as string}
                                 onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                 className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        </div>
                    ))}

                    {/* Category Dropdown */}
                    <div className="relative col-span-1">
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">分类</label>
                      <button
                          type="button"
                          onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      >
                        <span>
                          {CATEGORIES.find(c => c.value === form.category)?.label || '请选择分类'}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isCategoryDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                            >
                              {CATEGORIES.map((cat) => (
                                  <button
                                      key={cat.value}
                                      type="button"
                                      onClick={() => {
                                        setForm(prev => ({ ...prev, category: cat.value }));
                                        setIsCategoryDropdownOpen(false);
                                      }}
                                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                                          form.category === cat.value
                                              ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                                              : 'text-zinc-700 dark:text-zinc-300'
                                      }`}
                                  >
                                    {cat.label}
                                  </button>
                              ))}
                            </motion.div>
                        )}
                      </AnimatePresence>

                      {isCategoryDropdownOpen && (
                          <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsCategoryDropdownOpen(false)}
                          />
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">产品描述（中文）</label>
                      <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">产品描述（英文）</label>
                      <textarea value={form.descriptionEn} onChange={e => setForm(f => ({ ...f, descriptionEn: e.target.value }))} rows={3}
                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">封面图</label>
                      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                        <ProductImagePreview src={form.coverImage || products.find(product => product.id === editId)?.images?.[0]} name={form.name.trim() || '未命名产品'} productId={editId ?? undefined} className="h-24 w-24" />
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-medium text-zinc-900 dark:text-white">{form.name.trim() || '请先填写产品名称'}</p>
                          <p className="mt-1 text-xs text-zinc-500">封面预览</p>
                        </div>
                        <label className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:w-auto">
                          <Upload className="h-4 w-4" /> {uploading ? '上传中...' : '上传'}
                          <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                        </label>
                      </div>
                      <details className="mt-2 text-sm text-zinc-500">
                        <summary className="cursor-pointer">手动设置图片链接</summary>
                        <input aria-label="封面图片链接" value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))} placeholder="图片 URL" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                      </details>
                    </div>
                    <div className="col-span-2 flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="rounded" />
                        <span className="text-zinc-700 dark:text-zinc-300">推荐产品</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
                        <span className="text-zinc-700 dark:text-zinc-300">上架</span>
                      </label>
                    </div>
                    <div className="col-span-2 flex justify-end gap-3">
                      <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">取消</button>
                      <button type="submit" disabled={createMutation.isPending} className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                        {createMutation.isPending ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}
