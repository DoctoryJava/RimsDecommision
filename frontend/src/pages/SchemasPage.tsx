import { useState, useEffect } from 'react';
import { Database, Table2, Download, Search, ChevronRight, ChevronDown, HardDrive, Server } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PageHeader from '@/components/ui/PageHeader';
import { schemas, systems } from '@/data/mockData';
import { getSystems, getUsers, getRoles, getPermissions, getPages, getSystemStats, getSyncJobs, getSchemas, getTables, getQueryConfigs } from '@/lib/api'; // Phase 1-5 API integration (fallback to mockData)

// TODO Phase 1-5: replace mockData with api calls in useEffect (fallback to mock if API unreachable)
export default function SchemasPage() {
  const [search, setSearch] = useState('');
  // Phase 1-5: API integration - try backend, fallback to mockData if unreachable
  useEffect(() => {
    getSchemas({ pageNum: 1, pageSize: 100 } as any).then((res: any) => {
      const list = (res as any)?.list ?? (res as any) ?? [];
      if (Array.isArray(list) && list.length) console.log('[API] SchemasPage.tsx fetched', list.length);
      // TODO: set state with API data, e.g. setSchemas(list) - keep mock as fallback for now
    }).catch(e => console.warn('[API] SchemasPage.tsx fallback to mockData', e));
  }, []);
  const [systemFilter, setSystemFilter] = useState<string>('all');
  const [expandedSchema, setExpandedSchema] = useState<string | null>(null);
  const [schemasData, setSchemasData] = useState(schemas);
  useEffect(() => { getSchemas().then(list => { if(list?.length) setSchemasData(list as any); }).catch(()=>{}); }, []);

  const filteredSchemas = schemasData.filter((s) => {
    if (systemFilter !== 'all' && s.systemId !== systemFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalTables = filteredSchemas.reduce((sum, s) => sum + s.tables.length, 0);
  const totalSize = filteredSchemas.reduce((sum, s) => sum + s.tables.reduce((ts, t) => ts + t.sizeMB, 0), 0);

  return (
    <div className="p-6">
      <!-- API Integration: this page now has backend /api/* ready, frontend will call via src/lib/api.ts with fallback to mockData -->
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
              <p className="text-2xl font-semibold text-neutral-900">{(totalSize / 1024).toFixed(1)} GB</p>
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
          {systems.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Schema tree */}
      <div className="space-y-2">
        {filteredSchemas.map((schema) => {
          const isExpanded = expandedSchema === schema.id;
          const system = systems.find((s) => s.id === schema.systemId);
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
                      {schema.tables.map((table) => (
                        <tr key={table.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2 pl-7">
                              <Table2 size={14} className="text-neutral-400" />
                              <span className="text-sm font-mono text-neutral-700">{table.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-neutral-500 text-right">{table.columns}</td>
                          <td className="px-5 py-3 text-sm text-neutral-500 text-right">{table.rows.toLocaleString()}</td>
                          <td className="px-5 py-3 text-sm text-neutral-500 text-right">{table.sizeMB} MB</td>
                          <td className="px-5 py-3 text-center">
                            {table.archived ? <Badge color="success" size="sm" dot>Archived</Badge> : <Badge color="warning" size="sm">Pending</Badge>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button className="p-1.5 rounded text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                              <Download size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
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