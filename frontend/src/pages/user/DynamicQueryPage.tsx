import { useState, useEffect } from 'react';
import {
  Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Filter, X, Code2, Eye, EyeOff, Download, RotateCcw, Plus, RefreshCw,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { executeQuery as apiExecuteQuery } from '@/lib/api';
import type { QueryConfig, FilterCondition, FilterOperator } from '@/types';
import { getSystems, getUsers, getRoles, getPermissions, getPages, getSystemStats, getSyncJobs, getSchemas, getTables, getQueryConfigs } from '@/lib/api'; // Phase 1-5 API integration (fallback to mockData)

interface DynamicQueryPageProps {
  configs: QueryConfig[];
}

const operatorLabels: Record<FilterOperator, string> = {
  eq: '等于',
  ne: '不等于',
  gt: '大于',
  gte: '大于等于',
  lt: '小于',
  lte: '小于等于',
  like: '包含',
  in: '包含于',
  between: '介于',
  is_null: '为空',
  is_not_null: '不为空',
};

const statusColorMap: Record<string, 'success' | 'warning' | 'primary' | 'neutral' | 'error'> = {
  completed: 'success',
  shipped: 'primary',
  pending: 'warning',
  cancelled: 'neutral',
};

const levelColorMap: Record<string, 'primary' | 'neutral'> = {
  VIP: 'primary',
  普通: 'neutral',
};

// TODO Phase 1-5: replace mockData with api calls in useEffect (fallback to mock if API unreachable)
export default function DynamicQueryPage({ configs }: DynamicQueryPageProps) {
  const activeConfigs = configs.filter((c) => c.status === 'active');
  const [selectedConfigId, setSelectedConfigId] = useState<string>(activeConfigs[0]?.id || '');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [showSQL, setShowSQL] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(true);

  const selectedConfig = activeConfigs.find((c) => c.id === selectedConfigId) || activeConfigs[0];
  const [result, setResult] = useState<{ rows: Record<string, any>[]; total: number; page: number; pageSize: number; sql: string } | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // 从后端 /query/execute（基于 r_physical_table 等数据库表）拉取查询结果
  useEffect(() => {
    if (!selectedConfig) { setResult(null); return; }
    let cancelled = false;
    setQueryLoading(true);
    apiExecuteQuery({
      configId: selectedConfig.id,
      filters,
      sortField,
      sortDirection,
      page,
      pageSize: selectedConfig.pageSize,
    }).then((res) => {
      if (cancelled) return;
      const rows = res?.page?.list ?? [];
      setResult({
        rows,
        total: res?.page?.total ?? 0,
        page,
        pageSize: selectedConfig.pageSize,
        sql: res?.sql ?? '',
      });
    }).catch(() => { if (!cancelled) setResult({ rows: [], total: 0, page, pageSize: selectedConfig.pageSize, sql: '' }); })
      .finally(() => { if (!cancelled) setQueryLoading(false); });
    return () => { cancelled = true; };
  }, [selectedConfig, filters, sortField, sortDirection, page]);

  if (!selectedConfig) {
    return (
      <div className="p-6">
        <PageHeader title="动态查询" subtitle="基于配置自动生成的查询列表" />
        <div className="text-center py-20">
          <Search size={48} className="mx-auto text-neutral-300 mb-4" />
          <p className="text-neutral-500">暂无已发布的查询配置</p>
        </div>
      </div>
    );
  }

  if (queryLoading && !result) {
    return (
      <div className="p-6">
        <PageHeader title="动态查询" subtitle="基于配置自动生成的查询列表" />
        <div className="text-center py-20">
          <RefreshCw size={48} className="mx-auto text-neutral-300 mb-4 animate-spin" />
          <p className="text-neutral-500">加载中…</p>
        </div>
      </div>
    );
  }

  const current = result ?? { rows: [] as any[], total: 0, page: 1, pageSize: selectedConfig.pageSize, sql: '' };

  const visibleFields = selectedConfig.fields.filter((f) => f.visible);
  const filterableFields = selectedConfig.fields.filter((f) => f.filterable);

  const handleSort = (alias: string) => {
    if (sortField === alias) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(alias);
      setSortDirection('asc');
    }
  };

  const addFilter = () => {
    setFilters([...filters, { field: filterableFields[0]?.alias || '', operator: 'eq', value: '' }]);
  };

  const updateFilter = (index: number, patch: Partial<FilterCondition>) => {
    setFilters(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const resetQuery = () => {
    setFilters([]);
    setSortField(null);
    setSortDirection('asc');
    setPage(1);
  };

  const totalPages = Math.ceil(current.total / selectedConfig.pageSize) || 1;

  return (
    <div className="p-6">
      {/* API Integration: this page now has backend /api/* ready, frontend will call via src/lib/api.ts with fallback to mockData */}
      <PageHeader
        title="动态查询"
        subtitle="基于后台配置自动生成的查询列表 — 用户直接使用"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<RotateCcw size={14} />} onClick={resetQuery}>重置</Button>
            <Button variant="outline" size="sm" icon={showSQL ? <EyeOff size={14} /> : <Eye size={14} />} onClick={() => setShowSQL(!showSQL)}>
              {showSQL ? '隐藏SQL' : '查看SQL'}
            </Button>
            <Button variant="outline" size="sm" icon={<Download size={14} />}>导出</Button>
          </div>
        }
      />

      {/* Config selector tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {activeConfigs.map((config) => (
          <button
            key={config.id}
            onClick={() => {
              setSelectedConfigId(config.id);
              setFilters([]);
              setSortField(null);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              selectedConfigId === config.id
                ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/20'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {config.name}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm text-neutral-500 mb-4">{selectedConfig.description}</p>

      {/* Filter panel */}
      <Card className="mb-4">
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-neutral-50/50 transition-colors"
          onClick={() => setShowFilterPanel(!showFilterPanel)}
        >
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700">筛选条件</span>
            {filters.length > 0 && <Badge color="primary" size="sm">{filters.length}</Badge>}
          </div>
          <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={(e) => { e.stopPropagation(); addFilter(); }}>添加筛选</Button>
        </div>
        {showFilterPanel && filters.length > 0 && (
          <div className="px-3 pb-3 space-y-2">
            {filters.map((filter, i) => {
              const field = selectedConfig.fields.find((f) => f.alias === filter.field);
              const options = field?.options || [];
              return (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(i, { field: e.target.value })}
                    className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none min-w-[120px]"
                  >
                    {filterableFields.map((f) => (
                      <option key={f.alias} value={f.alias}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(i, { operator: e.target.value as FilterOperator })}
                    className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none"
                  >
                    {Object.entries(operatorLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  {filter.operator !== 'is_null' && filter.operator !== 'is_not_null' && (
                    <>
                      {options.length > 0 ? (
                        <select
                          value={filter.value}
                          onChange={(e) => updateFilter(i, { value: e.target.value })}
                          className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none"
                        >
                          <option value="">全部</option>
                          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(i, { value: e.target.value })}
                          placeholder="值"
                          className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none min-w-[120px]"
                        />
                      )}
                      {filter.operator === 'between' && (
                        <input
                          type="text"
                          value={filter.value2 || ''}
                          onChange={(e) => updateFilter(i, { value2: e.target.value })}
                          placeholder="至"
                          className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none min-w-[80px]"
                        />
                      )}
                    </>
                  )}
                  <button onClick={() => removeFilter(i)} className="p-1.5 rounded text-neutral-400 hover:text-error-500 hover:bg-error-50 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* SQL preview */}
      {showSQL && (
        <Card className="mb-4 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-neutral-300">
            <Code2 size={16} />
            <span className="text-xs font-medium">生成的 SQL</span>
          </div>
          <pre className="text-xs font-mono text-neutral-100 bg-neutral-900 p-4 overflow-x-auto whitespace-pre-wrap">
            {current.sql}
          </pre>
        </Card>
      )}

      {/* Results table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <p className="text-sm text-neutral-600">
            共 <span className="font-semibold text-neutral-900">{current.total}</span> 条记录
          </p>
          <p className="text-xs text-neutral-400">第 {page} / {totalPages} 页</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                {visibleFields.map((field) => (
                  <th
                    key={field.id}
                    className={`text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap ${field.sortable ? 'cursor-pointer hover:bg-neutral-100 transition-colors' : ''}`}
                    onClick={() => field.sortable && handleSort(field.alias)}
                  >
                    <div className="flex items-center gap-1">
                      {field.label}
                      {field.sortable && (
                        <span className="ml-0.5">
                          {sortField === field.alias ? (
                            sortDirection === 'asc' ? <ChevronUp size={12} className="text-primary-500" /> : <ChevronDown size={12} className="text-primary-500" />
                          ) : (
                            <ChevronUp size={12} className="text-neutral-300" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {current.rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleFields.length} className="text-center py-12 text-sm text-neutral-400">
                    <Search size={32} className="mx-auto mb-2 text-neutral-300" />
                    未找到匹配的记录
                  </td>
                </tr>
              ) : (
                current.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                    {visibleFields.map((field) => (
                      <td key={field.id} className="px-4 py-3 text-sm text-neutral-700 whitespace-nowrap">
                        {renderCell(row[field.alias], field)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>每页 {selectedConfig.pageSize} 条</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<ChevronLeft size={14} />}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg transition-all ${
                    page === pageNum
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              iconRight={<ChevronRight size={14} />}
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function renderCell(value: string | number | boolean | null, field: { render?: string; alias: string }) {
  if (value === null || value === undefined || value === '') return <span className="text-neutral-300">—</span>;

  switch (field.render) {
    case 'badge':
      if (field.alias === 'status') {
        return <Badge color={statusColorMap[String(value)] || 'neutral'} dot>{String(value)}</Badge>;
      }
      if (field.alias === 'level') {
        return <Badge color={levelColorMap[String(value)] || 'neutral'}>{String(value)}</Badge>;
      }
      if (field.alias === 'is_paid') {
        return <Badge color={value === true || value === 'true' ? 'success' : 'neutral'} dot>{value === true || value === 'true' ? '已付款' : '未付款'}</Badge>;
      }
      return <Badge color="neutral">{String(value)}</Badge>;
    case 'tag':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-xs">{String(value)}</span>;
    case 'date':
      return <span className="text-neutral-600">{String(value)}</span>;
    default:
      return String(value);
  }
}