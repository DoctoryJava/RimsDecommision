import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Copy, Search, Eye, Code2, Database, Server,
  Layers, ArrowRight, Save, X, ChevronDown, ChevronRight, Play,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import type { QueryConfig, FieldMapping, JoinConfig, DrillConfig, DrillField } from '@/types';
import {
  getSystems, getQueryConfigs, getSystemSchema, createQueryConfig, updateQueryConfig, deleteQueryConfig,
  executeQuery as apiExecuteQuery,
  getDrillConfigs, createDrillConfig, updateDrillConfig, deleteDrillConfig,
} from '@/lib/api';

interface QueryConfigsPageProps {
  // 页面自管理系统与配置
}

// TODO Phase 1-5: replace mockData with api calls in useEffect (fallback to mock if API unreachable)
export default function QueryConfigsPage(_props: QueryConfigsPageProps) {
  const [search, setSearch] = useState('');
  const [systems, setSystems] = useState<any[]>([]);
  const [systemId, setSystemId] = useState('');
  const [configs, setLocalConfigs] = useState<QueryConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<QueryConfig | null>(null);
  const [isNewConfig, setIsNewConfig] = useState(false);
  const [showPreview, setShowPreview] = useState<QueryConfig | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [systemSchema, setSystemSchema] = useState<any[]>([]);

  // 加载系统列表
  useEffect(() => {
    getSystems({ pageNum: 1, pageSize: 100 }).then((p: any) => {
      const list = (p?.list ?? []) as any[];
      setSystems(list);
      if (list.length && !systemId) setSystemId(list[0].id);
    }).catch(() => {});
  }, [systemId]);

  // 按系统加载查询配置
  const loadConfigs = (sid: string) => {
    if (!sid) { setLocalConfigs([]); return; }
    getQueryConfigs(sid).then((list: any) => { if (Array.isArray(list)) setLocalConfigs(list as QueryConfig[]); }).catch(()=>{});
  };
  useEffect(() => { loadConfigs(systemId); }, [systemId]);

  // 按系统加载表结构（含每张表的字段）
  useEffect(() => {
    if (!systemId) { setSystemSchema([]); return; }
    getSystemSchema(systemId).then((list: any) => { if (Array.isArray(list)) setSystemSchema(list as any[]); }).catch(()=>{});
  }, [systemId]);

  // 把该系统的表结构拍平成选项：full=db.table, columns=该表字段
  const tableOptions = useMemo(() => {
    const opts: { db: string; table: string; full: string; columns: any[] }[] = [];
    (systemSchema || []).forEach((s: any) => {
      (s.tables || []).forEach((t: any) => {
        const tblName = typeof t === 'string' ? t : (t.name || '');
        const cols = typeof t === 'string' ? [] : (t.columns || []);
        if (tblName) opts.push({ db: s.database, table: tblName, full: `${s.database}.${tblName}`, columns: cols });
      });
    });
    return opts;
  }, [systemSchema]);

  const filtered = configs.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = async (config: QueryConfig) => {
    const withSystem = { ...config, systemId: config.systemId || systemId };
    const exists = configs.find((c) => c.id === config.id);
    try {
      if (exists) {
        await updateQueryConfig(config.id, withSystem);
        setLocalConfigs(configs.map((c) => (c.id === config.id ? withSystem : c)));
      } else {
        const created = await createQueryConfig(withSystem);
        setLocalConfigs([...(configs.filter((c) => c.id !== withSystem.id)), created]);
      }
      setEditingConfig(null);
      setIsNewConfig(false);
    } catch (e: any) {
      window.alert('保存失败：' + (e?.message || '请稍后重试'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确认删除该查询配置？')) return;
    try {
      await deleteQueryConfig(id);
      setLocalConfigs(configs.filter((c) => c.id !== id));
    } catch (e: any) {
      window.alert('删除失败：' + (e?.message || '请稍后重试'));
    }
  };

  const handleDuplicate = async (config: QueryConfig) => {
    const newConfig: QueryConfig = {
      ...config,
      id: `qc-${Date.now()}`,
      systemId: config.systemId || systemId,
      name: `${config.name} (副本)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    try {
      const created = await createQueryConfig(newConfig);
      setLocalConfigs([...configs, created]);
    } catch (e: any) {
      window.alert('复制失败：' + (e?.message || '请稍后重试'));
    }
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
        subtitle="按系统配置动态查询的基础表、关联关系和字段映射"
        actions={
          <Button icon={<Plus size={16} />} onClick={() => {
            setIsNewConfig(true);
            setEditingConfig({
            id: `qc-${Date.now()}`,
            systemId,
            name: '',
            description: '',
            baseTable: tableOptions[0]?.full || '',
            joins: [],
            fields: [],
            defaultSort: { field: '', direction: 'asc' },
            pageSize: 10,
            status: 'draft',
            createdBy: 'Sarah Chen',
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
            });
          }} disabled={!systemId}>新建查询配置</Button>
        }
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
            onChange={(e) => setSystemId(e.target.value)}
            className="flex-1 min-w-[240px] px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 outline-none"
          >
            {systems.length === 0 && <option value="">暂无系统</option>}
            {systems.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
      </Card>

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
                    <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={(e) => { e.stopPropagation(); setIsNewConfig(false); setEditingConfig(config); }}>编辑</Button>
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
          tables={tableOptions}
          isNew={isNewConfig}
          onSave={handleSave}
          onClose={() => { setEditingConfig(null); setIsNewConfig(false); }}
        />
      )}

      {showPreview && (
        <PreviewModal config={showPreview} onClose={() => setShowPreview(null)} />
      )}
    </div>
  );
}

function ConfigEditorModal({ config, tables, isNew = false, onSave, onClose }: {
  config: QueryConfig;
  tables: { db: string; table: string; full: string; columns: any[] }[];
  isNew?: boolean;
  onSave: (c: QueryConfig) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<QueryConfig>({ ...config });
  const [tab, setTab] = useState<'basic' | 'joins' | 'fields' | 'drill'>('basic');

  const updateField = (id: string, patch: Partial<FieldMapping>) => {
    setDraft({ ...draft, fields: draft.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  };
  const addField = () => {
    const newField: FieldMapping = {
      id: `f-${Date.now()}`,
      alias: '',
      table: draft.baseTable,
      column: '',
      sortable: false,
      filterable: false,
      visible: true,
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

  const availableTables = tables;
  const getColumns = (tableFull: string) => {
    const t = tables.find((x: any) => x.full === tableFull || x.table === tableFull);
    return (t?.columns || []) as any[];
  };

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
        {(['basic', 'joins', 'fields', 'drill'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-all relative ${
              tab === t ? 'text-primary-600' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t === 'basic' ? '基本信息' : t === 'joins' ? '表关联' : t === 'fields' ? '字段映射' : '下钻配置'}
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
                <option value="">请选择表</option>
                {availableTables.length > 0 ? (
                  availableTables.map((t) => (
                    <option key={t.full} value={t.full}>{t.full}</option>
                  ))
                ) : (
                  <option value="" disabled>暂无已同步的表（请先同步）</option>
                )}
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
                  {availableTables.map((t) => <option key={t.full} value={t.full}>{t.full}</option>)}
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
                  {availableTables.map((t) => <option key={t.full} value={t.full}>{t.full}</option>)}
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
                  placeholder="别名（结果列名）"
                  className="col-span-2 px-2 py-1.5 text-xs rounded-md border border-neutral-200 bg-white outline-none font-mono"
                />
                <select
                  value={field.table}
                  onChange={(e) => updateField(field.id, { table: e.target.value, column: '' })}
                  className="col-span-3 px-2 py-1.5 text-xs rounded-md border border-neutral-200 bg-white outline-none"
                >
                  {availableTables.map((t) => <option key={t.full} value={t.full}>{t.full}</option>)}
                </select>
                <select
                  value={field.column}
                  onChange={(e) => updateField(field.id, { column: e.target.value })}
                  className="col-span-3 px-2 py-1.5 text-xs rounded-md border border-neutral-200 bg-white outline-none font-mono"
                >
                  <option value="">列</option>
                  {getColumns(field.table).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <div className="col-span-3 flex items-center gap-2">
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

      {tab === 'drill' && (
        <DrillConfigTab
          queryConfigId={config.id}
          baseTable={draft.baseTable}
          tables={tables}
          getColumns={getColumns}
          isNew={isNew}
        />
      )}
    </Modal>
  );
}

// ── 下钻配置 tab：配置子表 / 关联字段 / 多级下钻，保存到 r_drill_config ──
function DrillConfigTab({
  queryConfigId, baseTable, tables, getColumns, isNew = false,
}: {
  queryConfigId: string;
  baseTable: string;
  tables: { db: string; table: string; full: string; columns: any[] }[];
  getColumns: (tableFull: string) => any[];
  isNew?: boolean;
}) {
  const [tree, setTree] = useState<DrillConfig[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null=关闭表单, 'new'=新增
  const [form, setForm] = useState<DrillConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isNewConfig = isNew;
  const flatNodes = useMemo(() => {
    const out: DrillConfig[] = [];
    const walk = (nodes: DrillConfig[]) => nodes.forEach((n) => { out.push(n); if (n.children?.length) walk(n.children); });
    walk(tree);
    return out;
  }, [tree]);

  const load = () => {
    setLoaded(false);
    getDrillConfigs(queryConfigId).then((list) => setTree((list ?? []) as DrillConfig[])).catch(() => setTree([])).finally(() => setLoaded(true));
  };
  useEffect(() => { if (!isNewConfig) load(); }, [queryConfigId]);

  const emptyForm = (): DrillConfig => ({
    id: '',
    queryConfigId,
    parentId: '',
    name: '',
    baseTable: '',
    parentField: '',
    childField: '',
    fields: [],
    sortOrder: flatNodes.length,
  });

  const startCreate = () => { setEditingId('new'); setForm(emptyForm()); };
  const startEdit = (node: DrillConfig) => {
    setEditingId(node.id);
    setForm({ ...node, fields: node.fields ? [...node.fields] : [], children: undefined });
  };
  const cancelForm = () => { setEditingId(null); setForm(null); };

  // 父级下拉选项：禁止选择自身及其后代，避免循环
  const parentOptions = useMemo(() => {
    if (!form || editingId === 'new') return flatNodes;
    const exclude = new Set<string>();
    const collect = (nodes: DrillConfig[]) => nodes.forEach((n) => {
      exclude.add(n.id);
      if (n.children?.length) collect(n.children);
    });
    const findNode = (nodes: DrillConfig[]): DrillConfig | undefined => {
      for (const n of nodes) {
        if (n.id === editingId) return n;
        if (n.children?.length) { const r = findNode(n.children); if (r) return r; }
      }
      return undefined;
    };
    const self = findNode(tree);
    if (self) collect([self]);
    return flatNodes.filter((n) => !exclude.has(n.id));
  }, [flatNodes, form, editingId, tree]);

  // 父表：选了父级则用父级的 baseTable，否则用查询基础表 baseTable
  const parentTable = useMemo(() => {
    if (form?.parentId) {
      const p = flatNodes.find((n) => n.id === form.parentId);
      if (p?.baseTable) return p.baseTable;
    }
    return baseTable;
  }, [form?.parentId, flatNodes, baseTable]);

  const childCols = getColumns(form?.baseTable || '');
  const parentCols = getColumns(parentTable);

  const toggleField = (col: string) => {
    if (!form) return;
    const cur = (form.fields || []).filter((f: any) => f.column && f.column !== col);
    const checked = (form.fields || []).some((f: any) => f.column === col);
    const fields = checked ? cur : [...cur, { column: col, alias: col }];
    setForm({ ...form, fields });
  };

  const validate = () => {
    if (!form) return '请先填写表单';
    if (!form.name) return '请填写下钻名称';
    if (!form.baseTable) return '请选择子表';
    if (!form.parentField) return `请选择父表(${parentTable})关联字段`;
    if (!form.childField) return '请选择子表关联字段';
    return null;
  };

  const handleSaveDrill = async () => {
    const err = validate();
    if (err) { window.alert(err); return; }
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        parentId: form.parentId || null,
        name: form.name,
        baseTable: form.baseTable,
        parentField: form.parentField,
        childField: form.childField,
        fields: form.fields || [],
        sortOrder: form.sortOrder ?? 0,
      };
      if (editingId === 'new') {
        await createDrillConfig(queryConfigId, payload);
      } else {
        await updateDrillConfig(queryConfigId, editingId!, payload);
      }
      cancelForm();
      load();
    } catch (e: any) {
      window.alert('保存下钻配置失败：' + (e?.message || '请稍后重试'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDrill = async (id: string) => {
    if (!window.confirm('确认删除该下钻配置？（其子级将一并删除）')) return;
    setDeleting(id);
    try {
      await deleteDrillConfig(queryConfigId, id);
      if (editingId === id) cancelForm();
      load();
    } catch (e: any) {
      window.alert('删除失败：' + (e?.message || '请稍后重试'));
    } finally {
      setDeleting(null);
    }
  };

  const renderNode = (node: DrillConfig, depth: number) => (
    <div key={node.id} className={depth > 0 ? 'ml-5 border-l-2 border-primary-100 pl-3 mt-2' : ''}>
      <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-2 min-w-0">
          <Layers size={15} className="text-primary-500 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-800">{node.name}</span>
              <Badge color="primary" size="sm">{node.baseTable}</Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-mono truncate">
              {node.parentField} =&gt; {node.childField}
              {node.fields?.length ? ` · ${node.fields.length} 字段` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => startEdit(node)}>编辑</Button>
          <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} disabled={deleting === node.id} onClick={() => handleDeleteDrill(node.id)} />
        </div>
      </div>
      {node.children?.length ? node.children.map((c) => renderNode(c, depth + 1)) : null}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          配置「关联明细下钻」：定义从主表（或上级子表）展开到子表的层级关系
        </p>
        <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={startCreate} disabled={isNewConfig}>
          添加下钻
        </Button>
      </div>

      {isNewConfig ? (
        <div className="text-center py-10 border-2 border-dashed border-neutral-200 rounded-lg">
          <Layers size={32} className="mx-auto text-neutral-300 mb-2" />
          <p className="text-sm text-neutral-500">
            这是尚未保存的新查询配置。请先点击底部「保存配置」创建查询后，再回来配置下钻。
          </p>
        </div>
      ) : !loaded ? (
        <div className="text-center py-10 text-sm text-neutral-400">加载下钻配置…</div>
      ) : tree.length === 0 && !form ? (
        <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-lg">
          <Layers size={32} className="mx-auto text-neutral-300 mb-2" />
          <p className="text-sm text-neutral-400">暂无下钻配置，点击"添加下钻"开始配置</p>
        </div>
      ) : (
        <>
          {tree.length > 0 && <div className="space-y-2">{tree.map((n) => renderNode(n, 0))}</div>}

          {(editingId || form) && (
            <div className="border rounded-lg border-primary-200 bg-primary-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-800">
                  {editingId === 'new' ? '新增下钻节点' : '编辑下钻节点'}
                </p>
                <button onClick={cancelForm} className="text-neutral-400 hover:text-neutral-600"><X size={16} /></button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">下钻名称 *</label>
                  <input
                    type="text"
                    value={form?.name || ''}
                    onChange={(e) => form && setForm({ ...form, name: e.target.value })}
                    placeholder="例如：订单行明细"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">上级（父级）节点</label>
                  <select
                    value={form?.parentId || ''}
                    onChange={(e) => form && setForm({ ...form, parentId: e.target.value || '' })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white outline-none"
                  >
                    <option value="">主表（{baseTable || '基础表'}）</option>
                    {parentOptions.map((n) => <option key={n.id} value={n.id}>{n.name}（{n.baseTable}）</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">子表（下钻目标表）*</label>
                  <select
                    value={form?.baseTable || ''}
                    onChange={(e) => {
                      if (!form) return;
                      const next = { ...form, baseTable: e.target.value, childField: '' };
                      setForm(next);
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white outline-none"
                  >
                    <option value="">请选择表</option>
                    {tables.length ? tables.map((t) => <option key={t.full} value={t.full}>{t.full}</option>) : <option value="" disabled>暂无已同步的表</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">父表关联字段 *（{parentTable}）</label>
                  <select
                    value={form?.parentField || ''}
                    onChange={(e) => form && setForm({ ...form, parentField: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white outline-none font-mono"
                  >
                    <option value="">选择列</option>
                    {parentCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">子表关联字段 *（{form?.baseTable || ''}）</label>
                  <select
                    value={form?.childField || ''}
                    onChange={(e) => form && setForm({ ...form, childField: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white outline-none font-mono"
                  >
                    <option value="">选择列</option>
                    {childCols.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">显示字段（不选则显示全部列）</label>
                {childCols.length === 0 ? (
                  <p className="text-xs text-neutral-400">请先选择子表</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {childCols.map((c: any) => {
                      const checked = (form?.fields || []).some((f: any) => f.column === c.name);
                      return (
                        <label key={c.name} className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border cursor-pointer transition-colors bg-white border-neutral-200 hover:border-primary-300">
                          <input type="checkbox" checked={checked} onChange={() => toggleField(c.name)} className="w-3 h-3 rounded text-primary-500" />
                          <span className="font-mono text-neutral-700">{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={cancelForm}>取消</Button>
                <Button size="sm" icon={<Save size={14} />} disabled={saving} onClick={handleSaveDrill}>
                  {editingId === 'new' ? '保存下钻配置' : '保存修改'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PreviewModal({ config, onClose }: { config: QueryConfig; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [sql, setSql] = useState('');
  const [total, setTotal] = useState(0);
  const visibleFields = config.fields.filter((f) => f.visible);

  // 预览数据来自后端 /query/execute（数据库表）
  useEffect(() => {
    let cancelled = false;
    apiExecuteQuery({ configId: config.id, page: 1, pageSize: 5 }).then((res) => {
      if (cancelled) return;
      setRows((res?.page?.list ?? []) as any[]);
      setTotal(res?.page?.total ?? 0);
      setSql(res?.sql ?? '');
    }).catch(() => { if (!cancelled) { setRows([]); setTotal(0); setSql(''); } });
    return () => { cancelled = true; };
  }, [config.id]);

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
          <Badge color="primary" size="sm">{total} 条记录</Badge>
          <Badge color="neutral" size="sm">{visibleFields.length} 个字段</Badge>
          <Badge color="neutral" size="sm">{config.joins.length} 个关联</Badge>
        </div>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                {visibleFields.map((f) => (
                  <th key={f.id} className="text-left px-3 py-2 text-xs font-semibold text-neutral-600 whitespace-nowrap">
                    {f.alias}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row, i) => (
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
          <pre className="text-xs font-mono text-neutral-100 bg-neutral-900 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap min-h-[48px]">
            {sql ? sql : <span className="text-neutral-500">（暂无 SQL，预览基于同步表数据自动生成）</span>}
          </pre>
        </div>
      </div>
    </Modal>
  );
}

