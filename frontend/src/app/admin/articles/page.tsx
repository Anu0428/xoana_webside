'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articleApi, uploadApi, getApiErrorMessage } from '@/lib/api';
import { galleryImageUrl } from '@/lib/gallery';
import { Pagination } from '@/components/ui/pagination';
import { QueryFeedback } from '@/components/ui/query-feedback';
import type { Article } from '@/types/models';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, X, Upload, Download, Upload as UploadIcon, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ArticleForm {
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  summary: string;
  summaryEn: string;
  category: string;
  author: string;
  coverImage: string;
  published: boolean;
}

const defaultForm: ArticleForm = { title: '', titleEn: '', content: '', contentEn: '', summary: '', summaryEn: '', category: '', author: 'XOANA Team', coverImage: '', published: false };

export default function AdminArticlesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ArticleForm>(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(0);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin-articles', page],
    queryFn: () => articleApi.getAllAdmin({ page, size: 20 }),
  });

  const articles = data?.data?.data?.content || [];

  const mutation = useMutation({
    mutationFn: (data: ArticleForm) => editId ? articleApi.update(editId, data) : articleApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-articles'] });
      void qc.invalidateQueries({ queryKey: ['articles'] });
      void qc.invalidateQueries({ queryKey: ['recent-articles'] });
      void qc.invalidateQueries({ queryKey: ['article'] });
      setShowForm(false); setForm(defaultForm); setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: articleApi.delete,
    onSuccess: () => {
      if (articles.length === 1 && page > 0) setPage(page - 1);
      void qc.invalidateQueries({ queryKey: ['admin-articles'] });
      void qc.invalidateQueries({ queryKey: ['articles'] });
      void qc.invalidateQueries({ queryKey: ['recent-articles'] });
      void qc.invalidateQueries({ queryKey: ['article'] });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file);
      const imageUrl = galleryImageUrl(res.data.data);

      setForm(f => ({ ...f, coverImage: imageUrl }));
    } catch (err) {
      alert(getApiErrorMessage(err, '上传失败'));
    } finally {
      setUploading(false);
    }
  };

  const handleInsertImage = (field: 'content' | 'contentEn') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const res = await uploadApi.uploadImage(file);
        const url = galleryImageUrl(res.data.data);
        if (url) setForm(f => ({ ...f, [field]: f[field] + `\n<img src="${url}" alt="" />\n` }));
      } catch { alert('上传失败'); }
    };
    input.click();
  };

  const handleEdit = (article: Article) => {
    setEditId(article.id);
    setForm({ title: article.title, titleEn: article.titleEn || '', content: article.content || '', contentEn: article.contentEn || '', summary: article.summary || '', summaryEn: article.summaryEn || '', category: article.category || '', author: article.author || 'XOANA Team', coverImage: article.coverImage || '', published: article.published });
    setShowForm(true);
  };

  const handleExport = () => {
    const exportData = articles.map((a) => ({
      id: a.id,
      title: a.title,
      titleEn: a.titleEn,
      summary: a.summary,
      summaryEn: a.summaryEn,
      content: a.content,
      contentEn: a.contentEn,
      category: a.category,
      author: a.author,
      coverImage: a.coverImage,
      published: a.published,
      viewCount: a.viewCount,
      createdAt: a.createdAt,
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xoana-articles-${new Date().toISOString().split('T')[0]}.json`;
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
          alert('文件格式不正确：应为文章数组');
          return;
        }

        if (confirm(`确定要导入 ${imported.length} 篇文章吗？这将批量创建新文章。`)) {
          let successCount = 0;
          let failCount = 0;

          for (const article of imported) {
            try {
              await articleApi.create({
                title: article.title,
                titleEn: article.titleEn,
                content: article.content,
                contentEn: article.contentEn,
                summary: article.summary,
                summaryEn: article.summaryEn,
                category: article.category,
                author: article.author,
                coverImage: article.coverImage,
                published: article.published,
              });
              successCount++;
            } catch (err) {
              console.error('导入文章失败:', article.title, err);
              failCount++;
            }
          }

          alert(`导入完成！成功：${successCount}, 失败：${failCount}`);
          qc.invalidateQueries({ queryKey: ['admin-articles'] });
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">文章管理</h1>
          <div className="flex gap-2">
            <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <Download className="h-4 w-4" />
              导出本页文章
            </button>
            <button
                onClick={handleImport}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <UploadIcon className="h-4 w-4" />
              导入文章
            </button>
            <button
                onClick={() => { setShowForm(true); setEditId(null); setForm(defaultForm); }}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
            >
              <Plus className="h-4 w-4" /> 写文章
            </button>
          </div>
        </div>

        <QueryFeedback pending={isPending} error={isError} retry={() => { void refetch(); }} />
        {(mutation.isError || deleteMutation.isError) && <p role="alert" className="mb-4 text-sm text-red-600">{getApiErrorMessage(mutation.error || deleteMutation.error, '文章操作失败，修改已保留，请重试。')}</p>}
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              {['标题', '分类', '状态', '创建时间', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500">{h}</th>
              ))}
            </tr>
            </thead>
            <tbody>
            {articles.length === 0 && !isPending && !isError ? (
                <tr><td colSpan={5} className="py-12 text-center text-zinc-400">暂无文章</td></tr>
            ) : articles.map((a) => (
                <tr key={a.id} className="border-b border-zinc-50 dark:border-zinc-800/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white max-w-xs truncate">{a.title}</td>
                  <td className="px-4 py-3 text-zinc-500">{a.category}</td>
                  <td className="px-4 py-3">
                  <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs ${a.published ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    {a.published ? <><Eye className="h-3 w-3" /> 已发布</> : <><EyeOff className="h-3 w-3" /> 草稿</>}
                  </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(a)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm('确认删除？')) deleteMutation.mutate(a.id); }} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={data?.data.data.totalPages ?? 0} onChange={setPage} disabled={isPending} />

        <AnimatePresence>
          {showForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900" style={{ maxHeight: '90vh' }}>
                  <div className="flex items-center justify-between border-b border-zinc-100 p-6 dark:border-zinc-800">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{editId ? '编辑文章' : '写文章'}</h2>
                    <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-zinc-500" /></button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-6">
                    <form id="article-form" onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">标题（中文）*</label>
                          <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">标题（英文）</label>
                          <input value={form.titleEn} onChange={e => setForm(f => ({ ...f, titleEn: e.target.value }))} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">分类</label>
                          <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">作者</label>
                          <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">摘要（中文）</label>
                        <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={2}
                                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">摘要（英文）</label>
                        <textarea value={form.summaryEn} onChange={e => setForm(f => ({ ...f, summaryEn: e.target.value }))} rows={2}
                                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">正文内容（中文，支持 HTML）</label>
                          <button type="button" onClick={() => handleInsertImage('content')} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700">
                            <Upload className="h-3 w-3" /> 插入图片
                          </button>
                        </div>
                        <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={8}
                                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 font-mono text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">正文内容（英文，支持 HTML）</label>
                          <button type="button" onClick={() => handleInsertImage('contentEn')} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700">
                            <Upload className="h-3 w-3" /> 插入图片
                          </button>
                        </div>
                        <textarea value={form.contentEn} onChange={e => setForm(f => ({ ...f, contentEn: e.target.value }))} rows={8}
                                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 font-mono text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">封面图</label>
                        <div className="flex gap-2">
                          <input value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))} placeholder="图片 URL" className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">
                            <Upload className="h-4 w-4" /> {uploading ? '上传中...' : '上传'}
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          </label>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} className="rounded" />
                        <span className="text-zinc-700 dark:text-zinc-300">立即发布</span>
                      </label>
                    </form>
                  </div>
                  <div className="flex justify-end gap-3 border-t border-zinc-100 p-4 dark:border-zinc-800">
                    <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">取消</button>
                    <button form="article-form" type="submit" disabled={mutation.isPending} className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                      {mutation.isPending ? '保存中...' : (form.published ? '发布' : '保存草稿')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}
