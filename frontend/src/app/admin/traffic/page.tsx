'use client';

import { useQuery } from '@tanstack/react-query';
import { trafficApi } from '@/lib/api';
import { BarChart3, Users, Eye, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { QueryFeedback } from '@/components/ui/query-feedback';

export default function AdminTrafficPage() {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['traffic-stats-30'],
        queryFn: () => trafficApi.getStats(30),
    });

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                    <p className="text-sm text-zinc-500">加载中...</p>
                </div>
            </div>
        );
    }

    if (isError) return <QueryFeedback pending={false} error retry={() => { void refetch(); }} />;
    const stats = data?.data?.data;
    const topPages = stats?.topPages || [];
    const dailyVisits = stats?.dailyVisits || [];
    const maxDailyVisits = Math.max(1, ...dailyVisits.map(([, count]) => count));

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">流量统计</h1>
                <p className="text-zinc-500 dark:text-zinc-400">最近 30 天数据</p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    { label: '总访问量', value: stats?.totalVisits ?? 0, icon: Eye },
                    { label: '总用户数', value: stats?.totalUsers ?? 0, icon: Users },
                    { label: '总订单数', value: stats?.totalOrders ?? 0, icon: TrendingUp },
                    { label: '页面种类', value: topPages.length || 0, icon: BarChart3 },
                ].map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-900">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                                <card.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
                                <p className="text-xs text-zinc-500">{card.label}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
                    <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">热门页面</h2>
                    {topPages.length === 0 ? (
                        <p className="py-8 text-center text-sm text-zinc-400">暂无数据</p>
                    ) : topPages.map(([path, count]: [string, number], i: number) => (
                        <div key={i} className="mb-3 flex items-center gap-3">
                            <span className="w-6 text-center text-xs font-bold text-zinc-400">{i + 1}</span>
                            <div className="flex-1">
                                <div className="mb-1 flex items-center justify-between">
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{path}</span>
                                    <span className="text-xs font-medium text-zinc-500">{count}</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (count / (topPages[0]?.[1] || 1)) * 100)}%` }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
                    <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">每日访问</h2>
                    {dailyVisits.length === 0 ? (
                        <p className="py-8 text-center text-sm text-zinc-400">暂无数据，请先浏览网站页面</p>
                    ) : (
                        <div className="space-y-2">
                            {dailyVisits.map(([date, count]: [string, number], i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-24 text-xs text-zinc-500">{String(date)}</span>
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (count / maxDailyVisits) * 100)}%` }} />
                                    </div>
                                    <span className="text-xs font-medium text-zinc-500 w-8 text-right">{count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

