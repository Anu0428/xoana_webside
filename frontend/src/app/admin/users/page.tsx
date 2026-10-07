'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, getApiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import { Pagination } from '@/components/ui/pagination';
import { QueryFeedback } from '@/components/ui/query-feedback';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => userApi.getAllAdmin({ page, size: 20 }),
  });
  const users = data?.data?.data?.content || [];

  const toggleMutation = useMutation({
    mutationFn: userApi.toggleStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">用户管理</h1>
        <p className="text-zinc-500 dark:text-zinc-400">共 {data?.data.data.totalElements ?? 0} 名用户</p>
      </div>
      <QueryFeedback pending={isPending} error={isError} retry={() => { void refetch(); }} />
      {toggleMutation.isError && <p role="alert" className="mb-4 text-sm text-red-600">{getApiErrorMessage(toggleMutation.error, '更新用户状态失败，请重试。')}</p>}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              {['用户名', '昵称', '邮箱', '角色', '状态', '注册时间', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !isPending && !isError ? (
              <tr><td colSpan={7} className="py-12 text-center text-zinc-400">暂无用户</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-50 dark:border-zinc-800/50">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{u.username}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{u.nickname || '-'}</td>
                <td className="px-4 py-3 text-zinc-500">{u.email}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${u.role === 'ADMIN' ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-500'}`}>{u.role === 'ADMIN' ? '管理员' : '普通用户'}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${u.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>{u.enabled ? '正常' : '已禁用'}</span></td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <button disabled={toggleMutation.isPending} onClick={() => { if (confirm(`确认${u.enabled ? '禁用' : '启用'}此用户？`)) toggleMutation.mutate(u.id); }}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${u.enabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {u.enabled ? '禁用' : '启用'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data?.data.data.totalPages ?? 0} onChange={setPage} disabled={isPending} />
    </div>
  );
}
