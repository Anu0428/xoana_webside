'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactApi, getApiErrorMessage } from '@/lib/api';
import { Pagination } from '@/components/ui/pagination';
import { QueryFeedback } from '@/components/ui/query-feedback';
import { formatDate } from '@/lib/utils';
import { Trash2, Mail, MailOpen } from 'lucide-react';

export default function AdminMessagesPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin-messages', page],
    queryFn: () => contactApi.getAll({ page, size: 20 }),
  });

  const messages = data?.data?.data?.content || [];

  const markReadMutation = useMutation({
    mutationFn: (id: number) => contactApi.markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-messages'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contactApi.delete(id),
    onSuccess: () => {
      if (messages.length === 1 && page > 0) setPage(page - 1);
      void qc.invalidateQueries({ queryKey: ['admin-messages'] });
    },
  });

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">联系消息</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-violet-600 dark:text-violet-400">本页 {unreadCount} 条未读消息</p>
          )}
        </div>
      </div>

      <QueryFeedback pending={isPending} error={isError} retry={() => { void refetch(); }} />
      {(markReadMutation.isError || deleteMutation.isError) && <p role="alert" className="mb-4 text-sm text-red-600">{getApiErrorMessage(markReadMutation.error || deleteMutation.error, '更新消息失败，请重试。')}</p>}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
        {messages.length === 0 && !isPending && !isError ? (
          <div className="py-16 text-center text-zinc-400">
            <Mail className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>暂无联系消息</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-5 transition-colors ${!msg.read ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {msg.read ? (
                        <MailOpen className="h-4 w-4 shrink-0 text-zinc-400" />
                      ) : (
                        <Mail className="h-4 w-4 shrink-0 text-violet-600" />
                      )}
                      <span className="font-medium text-zinc-900 dark:text-white">{msg.name}</span>
                      <span className="text-sm text-zinc-500">{msg.email}</span>
                      {!msg.read && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                          未读
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer ${expanded !== msg.id ? 'line-clamp-2' : ''}`}
                      onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                    >
                      {msg.message}
                    </p>
                    {expanded === msg.id && (
                      <button
                        onClick={() => setExpanded(null)}
                        className="mt-1 text-xs text-violet-600 hover:underline"
                      >
                        收起
                      </button>
                    )}
                    {expanded !== msg.id && msg.message.length > 100 && (
                      <button
                        onClick={() => setExpanded(msg.id)}
                        className="mt-1 text-xs text-violet-600 hover:underline"
                      >
                        展开
                      </button>
                    )}
                    <p className="mt-2 text-xs text-zinc-400">{formatDate(msg.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!msg.read && (
                      <button
                        disabled={markReadMutation.isPending}
                        onClick={() => markReadMutation.mutate(msg.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                      >
                        标为已读
                      </button>
                    )}
                    <button
                      disabled={deleteMutation.isPending}
                      onClick={() => { if (confirm('确认删除此消息？')) deleteMutation.mutate(msg.id); }}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={data?.data.data.totalPages ?? 0} onChange={setPage} disabled={isPending} />
    </div>
  );
}
