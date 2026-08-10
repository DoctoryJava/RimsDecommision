import { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, Server, Database, Table2,
  Code2, Play, RefreshCw, X, ChevronDown,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { getSystems, getSparkSyncedTables, sparkExecuteQuery } from '@/lib/api';

interface SysOption { id: string; name: string; code: string }

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  total: number;
}

export default function DynamicQueryPage() {
  const [systems, setSystems] = useState<SysOption[]>([]);
  const [systemId, setSystemId] = useState('');
  const [syncedDbs, setSyncedDbs] = useState<any[]>([]);
  const [sql, setSql] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [loadingTables, setLoadingTables] = useState(false);
  const [expandedDb, setExpandedDb] = useState<string | null>(null);

  const loadSystems = useCallback(() => {
    getSystems({ pageNum: 1, pageSize: 100 }).then((p: any) => {
      const list = (p?.list ?? []) as any[];
      setSystems(list.map((s) => ({ id: s.id, name: s.name, code: s.code })));
      if (list.length && !systemId) setSystemId(list[0].id);
    }).catch(() => {});
  }, [systemId]);

  const loadTables = useCallback(() => {
    if (!systemId) { setSyncedDbs([]); return; }
    setLoadingTables(true);
    getSparkSyncedTables(systemId).then((list: any) => {
      setSyncedDbs((list ?? []) as any[]);
    }).catch(() => setSyncedDbs([])).finally(() => setLoadingTables(false));
  }, [systemId]);

  useEffect(() => { loadSystems(); }, [loadSystems]);
  useEffect(() => { loadTables(); }, [loadTables]);

  const runQuery = async () => {
    if (!sql.trim()) { setError('请输入 SQL'); return; }
    setRunning(true);
    setError('');
    try {
      const res = await sparkExecuteQuery({ systemId, sql, page, pageSize });
      setResult({ columns: res?.columns ?? [], rows: res?.rows ?? [], total: res?.total ?? 0 });
    } catch (e: any) {
      setError(e?.message || '查询失败');
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / pageSize));

  const insertTableName = (tbl: string) => {
    // 简化：SQL 里用 rims 目录访问，提示用户写完整表名
    setSql((prev) => prev + (prev.trim() ? ' ' : '') + 'SELECT * FROM rims.archive.' + tbl);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="动态查询"
        subtitle="基于 Spark 查询已同步的 Iceberg 数据 — 选择系统，查看已同步库表，编写 SQL 查询"
      />

      {/* System selector */}
      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Server size={16} className="text-neutral-400" />
            <span className="font-medium">选择系统</span>
          </div>
          <select
            value={systemId}
            onChange={(e) => { setSystemId(e.target.value); setResult(null); setPage(1); }}
            className="flex-1 min-w-[240px] px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 outline-none"
          >
            {systems.length === 0 && <option value="">暂无系统</option>}
            {systems.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
          <Button variant="outline" icon={<RefreshCw size={16} />} onClick={loadTables}>刷新</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Synced tables */}
        <Card className="overflow-hidden lg:col-span-1">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-primary-500" />
              <h3 className="text-base font-semibold text-neutral-900">已同步的库表</h3>
            </div>
            <Badge color="neutral" size="sm">{loadingTables ? '…' : syncedDbs.reduce((n, d) => n + (d.tables?.length || 0), 0)}</Badge>
          </div>
          {loadingTables ? (
            <div className="p-8 text-center text-sm text-neutral-400">加载中…</div>
          ) : syncedDbs.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">该系统暂无已同步的表</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {syncedDbs.map((db) => {
                const isExpanded = expandedDb === db.database;
                return (
                  <div key={db.database}>
                    <button
                      onClick={() => setExpandedDb(isExpanded ? null : db.database)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={15} className="text-neutral-400" /> : <ChevronRight size={15} className="text-neutral-400" />}
                        <Database size={15} className="text-primary-500" />
                        <span className="text-sm font-medium text-neutral-800">{db.database}</span>
                      </div>
                      <Badge color="neutral" size="sm">{db.tables?.length || 0}</Badge>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-3 space-y-1">
                        {(db.tables || []).map((t: string) => (
                          <button
                            key={t}
                            onClick={() => insertTableName(t)}
                            title="点击将表名插入 SQL"
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 rounded-md transition-colors"
                          >
                            <Table2 size={13} className="text-neutral-400" />
                            <span className="font-mono">{t}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* SQL + Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* SQL input */}
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-neutral-300">
              <Code2 size={16} />
              <span className="text-xs font-medium">Spark SQL</span>
              <span className="ml-auto text-[10px] text-neutral-500">Iceberg catalog: rims.archive.&lt;table&gt;</span>
            </div>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              rows={5}
              placeholder="SELECT * FROM rims.archive.orders LIMIT 100"
              className="w-full p-4 text-sm font-mono text-neutral-100 bg-neutral-900 outline-none resize-y focus:bg-neutral-800"
            />
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
              <p className="text-xs text-neutral-400">提示：点击左侧表名可插入表；表名格式 rims.archive.&lt;表名&gt;</p>
              <Button icon={<Play size={16} />} onClick={runQuery} disabled={running || !systemId}>
                {running ? '查询中…' : '执行查询'}
              </Button>
            </div>
          </Card>

          {error && (
            <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-sm text-error-600 flex items-center gap-2">
              <X size={16} /> {error}
            </div>
          )}

          {/* Results table */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <p className="text-sm text-neutral-600">
                共 <span className="font-semibold text-neutral-900">{result?.total ?? 0}</span> 条记录
              </p>
              <p className="text-xs text-neutral-400">第 {page} / {totalPages} 页</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    {(result?.columns ?? []).map((c) => (
                      <th key={c} className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                    {!result && (
                      <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400">执行 SQL 后显示结果</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {(result?.rows ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(1, (result?.columns ?? []).length)} className="text-center py-12 text-sm text-neutral-400">
                        <Search size={32} className="mx-auto mb-2 text-neutral-300" />
                        {result ? '未找到匹配的记录' : '输入 SQL 并点击「执行查询」'}
                      </td>
                    </tr>
                  ) : (
                    result!.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                        {result!.columns.map((c) => (
                          <td key={c} className="px-4 py-3 text-sm text-neutral-700 whitespace-nowrap">
                            {row[c] === null || row[c] === undefined ? <span className="text-neutral-300">—</span> : String(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>每页</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-neutral-200 rounded px-1 py-0.5">
                  {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" icon={<ChevronLeft size={14} />} disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                <span className="text-xs text-neutral-500">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" iconRight={<ChevronRight size={14} />} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
