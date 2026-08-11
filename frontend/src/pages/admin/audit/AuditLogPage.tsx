import { useState, useEffect, useCallback } from 'react';
import {
  Search, ScrollText, Database, RefreshCw, ChevronLeft, ChevronRight, Trash2, Eye, X,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import type { AuditLog, AuditActionType, AuditStatus } from '@/types';
import { getAuditLogs, deleteAuditLog } from '@/lib/api';

const actionLabel: Record<AuditActionType, string> = {
  query: 'SQL 查询',
  etl: 'ETL 任务',
};

const statusMap: Record<AuditStatus, { color: 'success' | 'error' | 'neutral' | 'warning'; label: string }> = {
  success: { color: 'success', label: '成功' },
  failed: { color: 'error', label: '失败' },
  started: { color: 'warning', label: '进行中' },
};

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditActionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [viewLog, setViewLog] = useState<AuditLog | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAuditLogs({
      pageNum: page, pageSize,
      actionType: actionFilter === 'all' ? undefined : actionFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search || undefined,
    }).then((p: any) => {
      setLogs((p?.list ?? []) as AuditLog[]);
      setTotal(p?.total ?? 0);
    }).catch(() => setLogs([])).finally(() => setLoading(false));
  }, [page, pageSize, actionFilter, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDelete = async (id: string) => {
    if (!window.confirm('确认删除该审计日志？')) return;
    try {
      await deleteAuditLog(id);
      load();
    } catch (e: any) {
      window.alert('删除失败：' + (e?.message || '请稍后重试'));
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Audit Log"
        subtitle="记录用户执行的 SQL 查询与手动 ETL 任务 — 操作人、时间、SQL、执行结果"
        actions={
          <Button variant="outline" icon={<RefreshCw size={16} />} onClick={load}>刷新</Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Database size={20} className="text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-neutral-900">{total}</p>
            <p className="text-xs text-neutral-500">Total Logs</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-error-50 flex items-center justify-center">
            <ScrollText size={20} className="text-error-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-neutral-900">{logs.filter(l => l.status === 'failed').length}</p>
            <p className="text-xs text-neutral-500">Failed (current page)</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜索操作人或 SQL..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value as AuditActionType | 'all'); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 outline-none transition-all"
        >
          <option value="all">All Types</option>
          <option value="query">SQL 查询</option>
          <option value="etl">ETL 任务</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as AuditStatus | 'all'); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 outline-none transition-all"
        >
          <option value="all">All Results</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
          <option value="started">进行中</option>
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">时间</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">操作人</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">类型</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">SQL / 操作</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">结果</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-neutral-400">加载中…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-neutral-400">暂无审计日志</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm text-neutral-600 whitespace-nowrap">{log.executedAt}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-600 shrink-0">
                          {log.operator?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium text-neutral-800">{log.operator || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge color={log.actionType === 'etl' ? 'secondary' : 'primary'} size="sm">
                        {actionLabel[log.actionType] || log.actionType}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs font-mono text-neutral-700 max-w-[360px] truncate">{log.sqlText || '—'}</p>
                      {log.systemId && <p className="text-xs text-neutral-400 mt-0.5">system: {log.systemId}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge color={statusMap[log.status]?.color ?? 'neutral'} size="sm" dot>
                        {statusMap[log.status]?.label ?? log.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => setViewLog(log)}>查看</Button>
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDelete(log.id)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100">
          <p className="text-xs text-neutral-500">共 {total} 条记录</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<ChevronLeft size={14} />} disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
            <span className="text-xs text-neutral-500">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" iconRight={<ChevronRight size={14} />} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
          </div>
        </div>
      </Card>

      {/* Detail modal */}
      {viewLog && (
        <Modal
          open
          onClose={() => setViewLog(null)}
          title={`审计日志详情`}
          subtitle={`${viewLog.executedAt} · ${viewLog.operator || '—'}`}
          size="lg"
          footer={<Button variant="outline" onClick={() => setViewLog(null)}>关闭</Button>}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge color={viewLog.actionType === 'etl' ? 'secondary' : 'primary'} size="sm">{actionLabel[viewLog.actionType] || viewLog.actionType}</Badge>
              <Badge color={statusMap[viewLog.status]?.color ?? 'neutral'} size="sm" dot>{statusMap[viewLog.status]?.label ?? viewLog.status}</Badge>
              {viewLog.systemId && <Badge color="neutral" size="sm">system: {viewLog.systemId}</Badge>}
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-600 mb-1.5">SQL / 操作</p>
              <pre className="text-xs font-mono text-neutral-100 bg-neutral-900 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">{viewLog.sqlText || '（无）'}</pre>
            </div>
            {viewLog.detail && Object.keys(viewLog.detail).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-600 mb-1.5">附加信息</p>
                <div className="rounded-lg border border-neutral-200 divide-y divide-neutral-100">
                  {Object.entries(viewLog.detail).map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-4 px-3 py-2">
                      <span className="text-xs text-neutral-500">{k}</span>
                      <span className="text-xs text-neutral-800 text-right break-all">{String(v ?? '—')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
