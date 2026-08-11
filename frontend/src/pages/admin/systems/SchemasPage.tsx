import { useState, useEffect } from 'react';
import { Database, Table2, Download, Loader2, Search, ChevronRight, ChevronDown, HardDrive, Server } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PageHeader from '@/components/ui/PageHeader';
import { getSchemas, getSystems, sparkExportCsv } from '@/lib/api';
import type { SchemaRecord, SystemRecord } from '@/types';

export default function SchemasPage() {
  const [search, setSearch] = useState('');
  const [systemFilter, setSystemFilter] = useState<string>('all');
  const [expandedSchema, setExpandedSchema] = useState<string | null>(null);
  const [schemasData, setSchemasData] = useState<SchemaRecord[]>([]);
  const [systemsData, setSystemsData] = useState<SystemRecord[]>([]);
  const [exporting, setExporting] = useState<string | null>(null); // 正在导出的表（schema|table）

  // 后端直接生成 CSV 流下载（导出 key 用 schema+table 组合，避免 table.id 缺失/重复）
  const exportTableCsv = async (schema: any, table: any) => {
    const tableName = table.name;
    const key = `${schema.id}|${tableName}`;
    if (exporting === key) return;
    const db = schema.name || '';
    const sql = `SELECT * FROM ${db}.archive.${tableName}`;
    setExporting(key);
    try {
      await sparkExportCsv({ systemId: schema.systemId, database: db, sql, filename: `${schema.name}.${tableName}` });
    } catch (e: any) {
      window.alert('导出失败：' + (e?.message || '请稍后重试'));
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    getSchemas().then((list: any) => { if(list?.length) setSchemasData(list as unknown as SchemaRecord[]); }).catch(()=>{});
    getSystems({ pageNum: 1, pageSize: 100 }).then((p: any) => { if(p?.list) setSystemsData(p.list as SystemRecord[]); }).catch(()=>{});
  }, []);

  const filteredSchemas = schemasData.filter((s) => {
    if (systemFilter !== 'all' && s.systemId !== systemFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalTables = filteredSchemas.reduce((sum, s) => sum + s.tables.length, 0);

  // 每张表的大小（字节）：优先真实 sizeBytes，兜底旧的 sizeMB*1024*1024
  const tableBytes = (t: any): number => {
    if (t.sizeBytes !== undefined && t.sizeBytes !== null) return Number(t.sizeBytes);
    return Number(t.sizeMB ?? 0) * 1024 * 1024;
  };
  const totalSize = filteredSchemas.reduce((sum, s) => sum + s.tables.reduce((ts, t) => ts + tableBytes(t), 0), 0);

  // 按数量级动态显示字节大小：<1KB->B, <1MB->KB, <1GB->MB, <1TB->GB, else TB
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes < 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`;
  };

  return (
    <div className="p-6">
      {/* API Integration: this page now has backend /api/* ready, frontend will call via src/lib/api.ts with fallback to mockData */}
      <PageHeader title="Schema Browser" subtitle="Browse archived database schemas and tables across all systems" />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Database size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900">{filteredSchemas.length}</p>
              <p className="text-xs text-neutral-500">Schemas</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary-50 flex items-center justify-center">
              <Table2 size={20} className="text-secondary-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900">{totalTables}</p>
              <p className="text-xs text-neutral-500">Tables</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center">
              <HardDrive size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-neutral-900">{formatBytes(totalSize)}</p>
              <p className="text-xs text-neutral-500">Total Size</p>
            </div>
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schemas..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>
        <select
          value={systemFilter}
          onChange={(e) => setSystemFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
        >
          <option value="all">All Systems</option>
          {systemsData.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Schema tree */}
      <div className="space-y-2">
        {filteredSchemas.map((schema) => {
          const isExpanded = expandedSchema === schema.id;
          const system = systemsData.find((s) => s.id === schema.systemId);
          return (
            <Card key={schema.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedSchema(isExpanded ? null : schema.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown size={18} className="text-neutral-400" /> : <ChevronRight size={18} className="text-neutral-400" />}
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Database size={18} className="text-primary-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-neutral-900 font-mono">{schema.name}</p>
                    <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                      <Server size={11} /> {system?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500">{schema.tables.length} tables</span>
                  <Badge color="neutral" size="sm">{system?.code}</Badge>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-neutral-100 animate-fade-in">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-neutral-50/50 text-xs text-neutral-500">
                        <th className="text-left px-5 py-2.5 font-medium">Table Name</th>
                        <th className="text-right px-5 py-2.5 font-medium">Columns</th>
                        <th className="text-right px-5 py-2.5 font-medium">Rows</th>
                        <th className="text-right px-5 py-2.5 font-medium">Size</th>
                        <th className="text-center px-5 py-2.5 font-medium">Status</th>
                        <th className="text-right px-5 py-2.5 font-medium">Export</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {schema.tables.map((table) => {
                        // 兼容不同同步来源的表结构：columns 可能是数组或数字，rows/sizeMB/archived 可能缺失
                        const columns = Array.isArray(table.columns) ? table.columns.length : (table.columns ?? 0);
                        const rows = Number(table.rows ?? 0);
                        const size = tableBytes(table);
                        const archived = table.archived ?? false;
                        return (
                        <tr key={table.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2 pl-7">
                              <Table2 size={14} className="text-neutral-400" />
                              <span className="text-sm font-mono text-neutral-700">{table.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-neutral-500 text-right">{columns}</td>
                          <td className="px-5 py-3 text-sm text-neutral-500 text-right">{rows.toLocaleString()}</td>
                          <td className="px-5 py-3 text-sm text-neutral-500 text-right">{formatBytes(size)}</td>
                          <td className="px-5 py-3 text-center">
                            {archived ? <Badge color="success" size="sm" dot>Archived</Badge> : <Badge color="warning" size="sm">Pending</Badge>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => exportTableCsv(schema, table)}
                              title={`导出 ${table.name} 为 CSV`}
                              className="p-1.5 rounded text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            >
                              {exporting === `${schema.id}|${table.name}` ? <Loader2 size={14} className="animate-spin text-primary-500" /> : <Download size={14} />}
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filteredSchemas.length === 0 && (
        <div className="text-center py-20">
          <Database size={48} className="mx-auto text-neutral-300 mb-4" />
          <p className="text-neutral-500">No schemas found matching your filters.</p>
        </div>
      )}
    </div>
  );
}