import { useState, useEffect } from 'react';
import { Database, Table2, Search, ChevronRight, Key, Hash, Calendar, Type, ToggleLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PageHeader from '@/components/ui/PageHeader';
import { physicalTables } from '@/data/queryData';
import type { FieldType } from '@/types';
import { getSystems, getUsers, getRoles, getPermissions, getPages, getSystemStats, getSyncJobs, getSchemas, getTables, getQueryConfigs } from '@/lib/api'; // Phase 1-5 API integration (fallback to mockData)

const typeIconMap: Record<FieldType, typeof Type> = {
  string: Type,
  number: Hash,
  date: Calendar,
  boolean: ToggleLeft,
  select: Key,
};

const typeColorMap: Record<FieldType, 'primary' | 'secondary' | 'accent' | 'warning' | 'neutral' | 'error'> = {
  string: 'neutral',
  number: 'primary',
  date: 'accent',
  boolean: 'warning',
  select: 'secondary',
};

// TODO Phase 1-5: replace mockData with api calls in useEffect (fallback to mock if API unreachable)
export default function DbInspectorPage() {
  const [selectedTable, setSelectedTable] = useState<string>(tablesData[0].name);
  // Phase 1-5: API integration - try backend, fallback to mockData if unreachable
  useEffect(() => {
    getTables({ pageNum: 1, pageSize: 100 } as any).then((res: any) => {
      const list = (res as any)?.list ?? (res as any) ?? [];
      if (Array.isArray(list) && list.length) console.log('[API] DbInspectorPage.tsx fetched', list.length);
      // TODO: set state with API data, e.g. setTables(list) - keep mock as fallback for now
    }).catch(e => console.warn('[API] DbInspectorPage.tsx fallback to mockData', e));
  }, []);
  const [search, setSearch] = useState('');
  const [tablesData, setTablesData] = useState(physicalTables);
  useEffect(() => { getTables().then(list => { if(list?.length) setTablesData(list as any); }).catch(()=>{}); }, []);

  const table = tablesData.find((t) => t.name === selectedTable) || tablesData[0];

  const filteredRows = table.rows.filter((row) =>
    Object.values(row).some((val) => String(val).toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="p-6">
      <!-- API Integration: this page now has backend /api/* ready, frontend will call via src/lib/api.ts with fallback to mockData -->
      <PageHeader
        title="数据库表结构"
        subtitle="查看物理表结构及数据 — 后台管理员功能"
      />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Table list */}
        <div className="lg:w-60 lg:shrink-0">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100">
              <p className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <Database size={16} /> 物理表 ({physicalTables.length})
              </p>
            </div>
            <div className="p-2">
              {physicalTables.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTable(t.name)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    selectedTable === t.name
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Table2 size={16} className={selectedTable === t.name ? 'text-primary-500' : 'text-neutral-400'} />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate">{t.label}</p>
                    <p className="text-xs text-neutral-400 font-mono truncate">{t.name}</p>
                  </div>
                  <Badge color="neutral" size="sm">{t.rows.length}</Badge>
                  {selectedTable === t.name && <ChevronRight size={14} className="text-primary-400" />}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Table detail */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Column definitions */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{table.label}</p>
                <p className="text-xs text-neutral-500 font-mono">{table.name} · {table.columns.length} 列 · {table.rows.length} 行</p>
              </div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {table.columns.map((col) => {
                  const Icon = typeIconMap[col.type];
                  return (
                    <div key={col.name} className="flex items-center gap-3 p-2.5 rounded-lg border border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        typeColorMap[col.type] === 'primary' ? 'bg-primary-50' :
                        typeColorMap[col.type] === 'secondary' ? 'bg-secondary-50' :
                        typeColorMap[col.type] === 'accent' ? 'bg-accent-50' :
                        typeColorMap[col.type] === 'warning' ? 'bg-warning-50' :
                        'bg-neutral-100'
                      }`}>
                        <Icon size={14} className={
                          typeColorMap[col.type] === 'primary' ? 'text-primary-500' :
                          typeColorMap[col.type] === 'secondary' ? 'text-secondary-500' :
                          typeColorMap[col.type] === 'accent' ? 'text-accent-500' :
                          typeColorMap[col.type] === 'warning' ? 'text-warning-500' :
                          'text-neutral-500'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 font-mono truncate">{col.name}</p>
                        <p className="text-xs text-neutral-500">{col.label}</p>
                      </div>
                      <Badge color={typeColorMap[col.type]} size="sm" variant="soft">{col.type}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Data preview */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-neutral-700">数据预览</p>
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索数据..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    {table.columns.map((col) => (
                      <th key={col.name} className="text-left px-3 py-2.5 text-xs font-semibold text-neutral-600 whitespace-nowrap">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredRows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                      {table.columns.map((col) => (
                        <td key={col.name} className="px-3 py-2 text-xs text-neutral-700 whitespace-nowrap font-mono">
                          {row[col.name] === null || row[col.name] === undefined ? (
                            <span className="text-neutral-300">NULL</span>
                          ) : typeof row[col.name] === 'boolean' ? (
                            <Badge color={row[col.name] ? 'success' : 'neutral'} size="sm" dot>{row[col.name] ? 'true' : 'false'}</Badge>
                          ) : (
                            String(row[col.name])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRows.length > 20 && (
              <div className="px-4 py-2.5 border-t border-neutral-100 text-center text-xs text-neutral-400">
                显示前 20 条，共 {filteredRows.length} 条匹配记录
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}