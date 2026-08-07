import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Copy, Search, Eye, Code2, Database,
  Layers, ArrowRight, Save, X, ChevronDown, ChevronRight, Play,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { physicalTables } from '@/data/queryData';
import { executeQuery } from '@/lib/queryEngine';
import type { QueryConfig, FieldMapping, JoinConfig } from '@/types';
import { getSystems, getUsers, getRoles, getPermissions, getPages, getSystemStats, getSyncJobs, getSchemas, getTables, getQueryConfigs } from '@/lib/api'; // Phase 1-5 API integration (fallback to mockData)

interface QueryConfigsPageProps {
  configs: QueryConfig[];
  setConfigs: (configs: QueryConfig[]) => void;
}

// TODO Phase 1-5: replace mockData with api calls in useEffect (fallback to mock if API unreachable)
export default function QueryConfigsPage({ configs, setConfigs }: QueryConfigsPageProps) {
  const [search, setSearch] = useState('');
  // Phase 4: fetch from backend with fallback to prop configs
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  const [editingConfig, setEditingConfig] = useState<QueryConfig | null>(null);
  const [showPreview, setShowPreview] = useState<QueryConfig | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch from backend on mount
  // useEffect(() => { getQueryConfigs().then(list => { if(list?.length) setConfigs(list as any); }).catch(()=>{}); }, []);
  const filtered = configs.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = (config: QueryConfig) => {
    const exists = configs.find((c) => c.id === config.id);
    if (exists) {
      setConfigs(configs.map((c) => (c.id === config.id ? config : c)));
    } else {
      setConfigs([...configs, config]);
    }
    setEditingConfig(null);
  };

  const handleDelete = (id: string) => {
    setConfigs(configs.filter((c) => c.id !== id));
  };

  const handleDuplicate = (config: QueryConfig) => {
    const newConfig: QueryConfig = {
      ...config,
      id: `qc-${Date.now()}`,
      name: `${config.name} (副本)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setConfigs([...configs, newConfig]);
  };

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  return (
    <div className="p-6">
      {/* API Integration: this page now has backend /api/* ready, frontend will call via src/lib/api.ts with fallback to mockData */}
      <PageHeader
        title="查询配置管理"
        subtitle="配置动态查询的数据源、关联关系和字段映射 — 后台管理员功能"
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setEditingConfig({
            id: `qc-${Date.now()}`,
            name: '',
            description: '',
            baseTable: 'orders',
            joins: [],
            fields: [],
            defaultSort: { field: '', direction: 'asc' },
            pageSize: 10,
            status: 'draft',
            createdBy: 'Sarah Chen',
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
          })}>新建查询配置</Button>
        }
      />

      <div className="relative max-w-sm mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索配置名称..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((config) => {
          const expanded = expandedRows.has(config.id);
          const joinCount = config.joins.length;
          const fieldCount = config.fields.length;
          const filterableCount = config.fields.filter((f) => f.filterable).length;
          return (
            <Card key={config.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-neutral-50/50 transition-colors"
                onClick={() => toggleRow(config.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {expanded ? <ChevronDown size={18} className="text-neutral-400 shrink-0" /> : <ChevronRight size={18} className="text-neutral-400 shrink-0" />}
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <Layers size={20} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-neutral-900 truncate">{config.name}</h3>
                        <Badge color={config.status === 'active' ? 'success' : 'neutral'} size="sm">
                          {config.status === 'active' ? '已发布' : '草稿'}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">{config.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden md:flex items-center gap-4 mr-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1"><Database size={13} /> {config.baseTable}</span>
                      <span className="flex items-center gap-1"><ArrowRight size={13} /> {joinCount} 关联</span>
                      <span className="flex items-center gap-1"><Layers size={13} /> {fieldCount} 字段</span>
                      <span className="flex items-center gap-1"><Search size={13} /> {filterableCount} 可筛选</span>
                    </div>
                    <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={(e) => { e.stopPropagation(); setShowPreview(config); }}>预览</Button>
                    <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={(e) => { e.stopPropagation(); setEditingConfig(config); }}>编辑</Button>
                    <Button variant="ghost" size="sm" icon={<Copy size={14} />} onClick={(e) => { e.stopPropagation(); handleDuplicate(config); }} />
                    <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={(e) => { e.stopPropagation(); handleDelete(config.id); }} />
                  </div>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-neutral-100 bg-neutral-50/30 p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-neutral-600 mb-2">关联配置</p>
                      {config.joins.length === 0 ? (
                        <p className="text-xs text-neutral-400">无关联</p>
                      ) : (
                        <div className="space-y-1.5">
                          {config.joins.map((j) => (
                            <div key={j.id} className="flex items-center gap-2 text-xs bg-white rounded-lg border border-neutral-200 px-3 py-2">
                              <Badge color="primary" size="sm">{j.leftTable}</Badge>
                              <span className="text-neutral-500 font-mono">{j.leftColumn}</span>
                              <ArrowRight size={12} className="text-neutral-400" />
                              <Badge color="secondary" size="sm">{j.rightTable}</Badge>
                              <span className="text-neutral-500 font-mono">{j.rightColumn}</span>
                              <Badge color="neutral" size="sm" variant="outline">{j.joinType}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-600 mb-2">字段映射 ({config.fields.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {config.fields.map((f) => (
                          <span key={f.id} className={`text-xs px-2 py-1 rounded-md font-mono ${f.visible ? 'bg-primary-50 text-primary-700' : 'bg-neutral-100 text-neutral-400 line-through'}`}>
                            {f.alias}
                            {f.filterable && <span className="ml-1 text-primary-400">🔍</span>}
                            {f.sortable && <span className="ml-1 text-accent-500">↕</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-neutral-500 flex items-center gap-4">
                    <span>默认排序: <span className="font-mono text-neutral-700">{config.defaultSort.field} {config.defaultSort.direction}</span></span>
                    <span>每页: <span className="font-mono text-neutral-700">{config.pageSize}</span></span>
                    <span>创建: {config.createdBy} · {config.createdAt}</span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {editingConfig && (
        <ConfigEditorModal
          config={editingConfig}
          onSave={handleSave}
          onClose={() => setEditingConfig(null)}
        />
      )}

      {showPreview && (
        <PreviewModal config={showPreview} onClose={() => setShowPreview(null)} />
      )}
    </div>
  );
}

function ConfigEditorModal({ config, onSave, onClose }: {
  config: QueryConfig;
  onSave: (c: QueryConfig) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<QueryConfig>({ ...config });
  const [tab, setTab] = useState<'basic' | 'joins' | 'fields'>('basic');

  const updateField = (id: string, patch: Partial<FieldMapping>) => {
    setDraft({ ...draft, fields: draft.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  };
  const addField = () => {
    const newField: FieldMapping = {
      id: `f-${Date.now()}`,
      alias: '',
      table: draft.baseTable,
      column: '',
      label: '',
      sortable: false,
      filterable: false,
      visible: true,
      render: 'text',
    };
    setDraft({ ...draft, fields: [...draft.fields, newField] });
  };
  const removeField = (id: string) => {
    setDraft({ ...draft, fields: draft.fields.filter((f) => f.id !== id) });
  };
  const addJoin = () => {
    const newJoin: JoinConfig = {
      id: `j-${Date.now()}`,
      leftTable: draft.baseTable,
      leftColumn: '',
      rightTable: '',
      rightColumn: '',
      joinType: 'left',
    };
    setDraft({ ...draft, joins: [...draft.joins, newJoin] });
  };
  const updateJoin = (id: string, patch: Partial<JoinConfig>) => {
    setDraft({ ...draft, joins: draft.joins.map((j) => (j.id === id ? { ...j, ...patch } : j)) });
  };
  const removeJoin = (id: string) => {
    setDraft({ ...draft, joins: draft.joins.filter((j) => j.id !== id) });
  };

  const availableTables = physicalTables;
  const getColumns = (tableName: string) => getTableColumns(tableName);

  return (
    <Modal
      open
      onClose={onClose}
      title={config.name ? '编辑查询配置' : '新建查询配置'}
      subtitle="配置数据源、表关联和字段映射"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button icon={<Save size={16} />} onClick={() => onSave(draft)}>保存配置</Button>
        </>
      }
    >
      <div className="flex items-center gap-1 mb-4 border-b border-neutral-200">
        {(['basic', 'joins', 'fields'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-all relative ${
              tab === t ? 'text-primary-600' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t === 'basic' ? '基本信息' : t === 'joins' ? '表关联' : '字段映射'}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />}
          </button>
        ))}
      </div>

      {tab === 'basic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">配置名称 *</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="例如：订单综合查询"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">状态</label>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as 'active' | 'draft' })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              >
                <option value="draft">草稿</option>
                <option value="active">已发布</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">描述</label>
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="描述这个查询的用途..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">基础表 *</label>
              <select
                value={draft.baseTable}
                onChange={(e) => setDraft({ ...draft, baseTable: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              >
                {availableTables.map((t) => (
                  <option key={t.name} value={t.name}>{t.label} ({t.name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">默认排序字段</label>
              <input
                type="text"
                value={draft.defaultSort.field}
                onChange={(e) => setDraft({ ...draft, defaultSort: { ...draft.defaultSort, field: e.target.value } })}
                placeholder="字段别名"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">排序方向</label>
              <select
                value={draft.defaultSort.direction}
                onChange={(e) => setDraft({ ...draft, defaultSort: { ...draft.defaultSort, direction: e.target.value as 'asc' | 'desc' } })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              >
                <option value="asc">升序 ASC</option>
                <option value="desc">降序 DESC</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">每页条数</label>
            <select
              value={draft.pageSize}
              onChange={(e) => setDraft({ ...draft, pageSize: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}

      {tab === 'joins' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600">配置表之间的关联关系</p>
            <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={addJoin}>添加关联</Button>
          </div>
          {draft.joins.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-lg">
              <Database size={32} className="mx-auto text-neutral-300 mb-2" />
              <p className="text-sm text-neutral-400">暂无关联，点击"添加关联"开始配置</p>
            </div>
          ) : (
            draft.joins.map((join) => (
              <div key={join.id} className="flex items-center gap-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                <select
                  value={join.leftTable}
                  onChange={(e) => updateJoin(join.id, { leftTable: e.target.value })}
                  className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none"
                >
                  {availableTables.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
                <select
                  value={join.leftColumn}
                  onChange={(e) => updateJoin(join.id, { leftColumn: e.target.value })}
                  className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none font-mono"
                >
                  <option value="">选择列</option>
                  {getColumns(join.leftTable).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <select
                  value={join.joinType}
                  onChange={(e) => updateJoin(join.id, { joinType: e.target.value as 'inner' | 'left' | 'right' })}
                  className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none"
                >
                  <option value="inner">INNER JOIN</option>
                  <option value="left">LEFT JOIN</option>
                  <option value="right">RIGHT JOIN</option>
                </select>
                <ArrowRight size={16} className="text-neutral-400" />
                <select
                  value={join.rightTable}
                  onChange={(e) => updateJoin(join.id, { rightTable: e.target.value })}
                  className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none"
                >
                  {availableTables.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
                <select
                  value={join.rightColumn}
                  onChange={(e) => updateJoin(join.id, { rightColumn: e.target.value })}
                  className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none font-mono"
                >
                  <option value="">选择列</option>
                  {getColumns(join.rightTable).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => removeJoin(join.id)} />
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'fields' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600">配置查询结果的字段映射 ({draft.fields.length})</p>
            <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={addField}>添加字段</Button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {draft.fields.map((field) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-neutral-200 bg-neutral-50">
                <input
                  type="text"
                  value={field.alias}
                  onChange={(e) => updateField(field.id, { alias: e.target.value })}
                  placeholder="别名"
                  className="col-span-2 px-2 py-1.5 text-xs rounded-md border border-neutral-200 bg-white outline-none font-mono"
                />
                <select
                  value={field.table}
                  onChange={(e) => updateField(field.id, { table: e.target.value, column: '' })}
                  className="col-span-2 px-2 py-1.5 text-xs rounded-md border border-neutral-200 bg-white outline-none"
                >
                  {availableTables.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
                <select
                  value={field.column}
                  onChange={(e) => updateField(field.id, { column: e.target.value })}
                  className="col-span-2 px-2 py-1.5 text-xs rounded-md border border-neutral-200 bg-white outline-none font-mono"
                >
                  <option value="">列</option>
                  {getColumns(field.table).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="显示名"
                  className="col-span-2 px-2 py-1.5 text-xs rounded-md border border-neutral-200 bg-white outline-none"
                />
                <select
                  value={field.render || 'text'}
                  onChange={(e) => updateField(field.id, { render: e.target.value as FieldMapping['render'] })}
                  className="col-span-1 px-1 py-1.5 text-xs rounded-md border border-neutral-200 bg-white outline-none"
                >
                  <option value="text">文本</option>
                  <option value="badge">徽章</option>
                  <option value="tag">标签</option>
                  <option value="date">日期</option>
                </select>
                <div className="col-span-2 flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-neutral-600 cursor-pointer">
                    <input type="checkbox" checked={field.visible} onChange={(e) => updateField(field.id, { visible: e.target.checked })} className="w-3.5 h-3.5 rounded text-primary-500" /> 显示
                  </label>
                  <label className="flex items-center gap-1 text-xs text-neutral-600 cursor-pointer">
                    <input type="checkbox" checked={field.filterable} onChange={(e) => updateField(field.id, { filterable: e.target.checked })} className="w-3.5 h-3.5 rounded text-primary-500" /> 筛选
                  </label>
                  <label className="flex items-center gap-1 text-xs text-neutral-600 cursor-pointer">
                    <input type="checkbox" checked={field.sortable} onChange={(e) => updateField(field.id, { sortable: e.target.checked })} className="w-3.5 h-3.5 rounded text-primary-500" /> 排序
                  </label>
                </div>
                <button onClick={() => removeField(field.id)} className="col-span-1 p-1.5 rounded text-neutral-400 hover:text-error-500 hover:bg-error-50 transition-colors justify-self-end">
                  <X size={14} />
                </button>
              </div>
            ))}
            {draft.fields.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-lg">
                <Layers size={32} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-sm text-neutral-400">暂无字段，点击"添加字段"开始配置</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function PreviewModal({ config, onClose }: { config: QueryConfig; onClose: () => void }) {
  const result = executeQuery(config, [], config.defaultSort.field, config.defaultSort.direction, 1, 5);
  const visibleFields = config.fields.filter((f) => f.visible);

  return (
    <Modal
      open
      onClose={onClose}
      title={`预览: ${config.name}`}
      subtitle="前 5 条数据预览"
      size="xl"
      footer={<Button variant="outline" onClick={onClose}>关闭</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Badge color="primary" size="sm">{result.total} 条记录</Badge>
          <Badge color="neutral" size="sm">{visibleFields.length} 个字段</Badge>
          <Badge color="neutral" size="sm">{config.joins.length} 个关联</Badge>
        </div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                {visibleFields.map((f) => (
                  <th key={f.id} className="text-left px-3 py-2 text-xs font-semibold text-neutral-600 whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {result.rows.map((row, i) => (
                <tr key={i} className="hover:bg-neutral-50/50">
                  {visibleFields.map((f) => (
                    <td key={f.id} className="px-3 py-2 text-xs text-neutral-700 whitespace-nowrap">
                      {String(row[f.alias] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-600 mb-2 flex items-center gap-1.5"><Code2 size={14} /> 生成的 SQL</p>
          <pre className="text-xs font-mono text-neutral-700 bg-neutral-900 text-neutral-100 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
            {result.sql}
          </pre>
        </div>
      </div>
    </Modal>
  );
}

function getTableColumns(tableName: string) {
  const table = physicalTables.find((t) => t.name === tableName);
  return table?.columns || [];
}