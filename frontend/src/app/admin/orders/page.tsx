'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi, getApiErrorMessage } from '@/lib/api';
import { Pagination } from '@/components/ui/pagination';
import { QueryFeedback } from '@/components/ui/query-feedback';
import type { OrderStatus } from '@/types/models';
import { formatPrice, formatDate } from '@/lib/utils';

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['SHIPPED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};
const STATUS_LABELS: Record<string, string> = { PENDING: '待支付', PAID: '已支付', SHIPPED: '已发货', DELIVERED: '已签收', CANCELLED: '已取消', REFUNDED: '已退款' };
const STATUS_COLORS: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-700', PAID: 'bg-green-100 text-green-700', SHIPPED: 'bg-blue-100 text-blue-700', DELIVERED: 'bg-violet-100 text-violet-700', CANCELLED: 'bg-zinc-100 text-zinc-500', REFUNDED: 'bg-red-100 text-red-500' };

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: () => orderApi.getAllAdmin({ page, size: 20 }),
  });
  const orders = data?.data?.data?.content || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => orderApi.updateStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
      void qc.invalidateQueries({ queryKey: ['my-orders'] });
      void qc.invalidateQueries({ queryKey: ['admin-recent-orders'] });
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">订单管理</h1>
      </div>
      <QueryFeedback pending={isPending} error={isError} retry={() => { void refetch(); }} />
      {updateMutation.isError && <p role="alert" className="mb-4 text-sm text-red-600">{getApiErrorMessage(updateMutation.error, '更新订单状态失败，请重试。')}</p>}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              {['订单号', '用户', '金额', '支付方式', '状态', '时间', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-zinc-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && !isPending && !isError ? (
              <tr><td colSpan={7} className="py-12 text-center text-zinc-400">暂无订单</td></tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="border-b border-zinc-50 dark:border-zinc-800/50">
                <td className="px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">{o.orderNo}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{o.user?.nickname || o.user?.username || '-'}</td>
                <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white">{formatPrice(o.totalAmount)}</td>
                <td className="px-4 py-3 text-zinc-500">{o.paymentMethod || '-'}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] || ''}`}>{STATUS_LABELS[o.status] || o.status}</span></td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(o.createdAt)}</td>
                <td className="px-4 py-3">
                  <select value={o.status} disabled={updateMutation.isPending || !STATUS_TRANSITIONS[o.status]?.length} onChange={e => updateMutation.mutate({ id: o.id, status: e.target.value })}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {[o.status, ...(STATUS_TRANSITIONS[o.status] || [])].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
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
