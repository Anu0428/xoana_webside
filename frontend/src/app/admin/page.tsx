'use client';

import { useQuery } from '@tanstack/react-query';
import { trafficApi, orderApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { Users, BarChart3, ShoppingBag } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { QueryFeedback } from '@/components/ui/query-feedback';

export default function AdminDashboard() {
  const { data: statsData, isPending: statsPending, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => trafficApi.getStats(7),
  });

  const { data: ordersData, isPending: ordersPending, isError: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: () => orderApi.getAllAdmin({ page: 0, size: 5 }),
  });

  const stats = statsData?.data?.data;
  const recentOrders = ordersData?.data?.data?.content || [];

  const cards = [
    { label: '总用户数', value: stats?.totalUsers ?? '—', icon: Users, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: '总订单数', value: stats?.totalOrders ?? '—', icon: ShoppingBag, color: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
    { label: '7日访问量', value: stats?.totalVisits ?? '—', icon: BarChart3, color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">仪表盘</h1>
        <p className="text-zinc-500 dark:text-zinc-400">欢迎回来，查看最新数据</p>
      </div>

      <QueryFeedback pending={statsPending} error={statsError} retry={() => { void refetchStats(); }} />
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className={`rounded-xl p-2.5 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">最近订单</h2>
        <QueryFeedback pending={ordersPending} error={ordersError} retry={() => { void refetchOrders(); }} />
        {recentOrders.length === 0 && !ordersPending && !ordersError ? (
          <p className="py-8 text-center text-sm text-zinc-400">暂无订单</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  {['订单号', '金额', '状态', '时间'].map(h => (
                    <th key={h} className="pb-3 text-left font-medium text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-zinc-50 dark:border-zinc-800/50">
                    <td className="py-3 font-medium text-zinc-900 dark:text-white">{order.orderNo}</td>
                    <td className="py-3 text-zinc-700 dark:text-zinc-300">{formatPrice(order.totalAmount)}</td>
                    <td className="py-3"><span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">{order.status}</span></td>
                    <td className="py-3 text-zinc-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
