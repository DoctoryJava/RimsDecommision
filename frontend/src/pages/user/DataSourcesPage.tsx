import { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Pencil, Trash2, RefreshCw, Search, Play, Server, History } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import {
  getSystems,
  getSourceDatabases,
  createSourceDatabase,
  updateSourceDatabase,
  deleteSourceDatabase,
  getSyncJobs,
  createSyncJob,
} from '@/lib/api';
import type { PageKey } from '@/components/layout/Sidebar';

const DB_TYPES = ['MYSQL', 'ORACLE', 'POSTGRESQL', 'SQLSERVER', 'MONGODB'];

const statusColor: Record<string, 'success' | 'primary' | 'error' | 'warning' | 'neutral'> = {
  success: 'success',
  syncing: 'primary',
  failed: 'error',
  partial: 'warning',
  idle: 'neutral',
  cancelled: 'neutral',
};

interface SysOption { id: string; name: string; code: string }

export default function DataSourcesPage({ onNavigate }: { onNavigate?: (p: PageKey) => void }) {
  const [systems, setSystems] = useState<SysOption[]>([]);
  const [systemId, setSystemId] = useState('');
  const [dbs, setDbs] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ dbType: 'MYSQL' });

  const loadSystems = useCallback(() => {
    getSystems({ pageNum: 1, pageSize: 100 }).then((p: any) => {
      const list = (p?.list ?? []) as any[];
      setSystems(list.map((s) => ({ id: s.id, name: s.name, code: s.code })));
      if (list.length && !systemId) setSystemId(list[0].id);
    }).catch(() => {});
  }, [systemId]);

  const loadDbs = useCallback(() => {
    if (!systemId) { setDbs([]); return; }
    getSourceDatabases({ systemId }).then(setDbs).catch(() => setDbs([]));
  }, [systemId]);

  const loadJobs = useCallback(() => {
    if (!systemId) { setJobs([]); return; }
    getSyncJobs({ pageNum: 1, pageSize: 50, systemId }).then((p: any) => {
      setJobs((p?.list ?? []) as any[]);
    }).catch(() => setJobs([]));
  }, [systemId]);

  useEffect(() => { loadSystems(); }, [loadSystems]);
  useEffect(() => { loadDbs(); }, [loadDbs]);
  useEffect(() => { loadJobs(); }, [loadJobs]);

  const openCreate = () => {
    setEditing(null);
    setForm({ sourceSystemId: systemId || systems[0]?.id || '', dbType: 'MYSQL' });
    setShowModal(true);
  };
  const openEdit = (row: any) => { setEditing(row); setForm({ ...row }); setShowModal(true); };

  const save = async () => {
    const payload = { ...form, sourceSystemId: form.sourceSystemId || systemId };
    if (!payload.sourceSystemId) { window.alert('请先选择所属系统'); return; }
    if (editing) await updateSourceDatabase(editing.id, payload);
    else await createSourceDatabase(payload);
    setShowModal(false);
    loadDbs();
  };

  const del = async (id: string) => {
    if (!window.confirm('确认删除该数据源？')) return;
    await deleteSourceDatabase(id);
    loadDbs();
  };

  const triggerSync = async () => {
    const sys = systems.find((s) => s.id === systemId);
    if (!sys) return;
    await createSyncJob({ systemId, systemName: sys.name, type: 'incremental', status: 'syncing', triggeredBy: 'Manual' });
    loadJobs();
  };

  const setField = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="p-6">
      <PageHeader
        title="数据源"
        subtitle="为系统填写源数据库信息、查看同步状态并触发同步，同步后即可查询数据"
        actions={
          <>
            <Button variant="outline" icon={<RefreshCw size={16} />} onClick={() => { loadDbs(); loadJobs(); }}>刷新</Button>
            <Button icon={<Plus size={16} />} onClick={openCreate}>新增数据源</Button>
          </>
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
            className="flex-1 min-w-[240px] px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          >
            {systems.length === 0 && <option value="">暂无系统</option>}
            {systems.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
          {onNavigate && (
            <Button variant="outline" icon={<Search size={16} />} onClick={() => onNavigate('dynamic-query')}>
              查询数据
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Source databases */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-primary-500" />
              <h3 className="text-base font-semibold text-neutral-900">源数据库</h3>
            </div>
            <Badge color="neutral" size="sm">{dbs.length} 个</Badge>
          </div>
          {dbs.length === 0 ? (
            <div className="p-10 text-center text-sm text-neutral-400">
              尚未配置数据源，点击右上角「新增数据源」为该系统填写连接信息。
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">数据库名</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">类型</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">服务器</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">描述</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {dbs.map((db) => (
                  <tr key={db.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-neutral-800">{db.databaseName}</td>
                    <td className="px-5 py-3"><Badge color="neutral" size="sm">{db.dbType}</Badge></td>
                    <td className="px-5 py-3 text-sm text-neutral-500">{db.server}</td>
                    <td className="px-5 py-3 text-sm text-neutral-500">{db.description || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => openEdit(db)} className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"><Pencil size={14} /></button>
                        <button onClick={() => del(db.id)} className="p-1.5 rounded text-neutral-400 hover:text-error-500 hover:bg-neutral-100"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Sync status */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={16} className="text-primary-500" />
              <h3 className="text-base font-semibold text-neutral-900">同步状态</h3>
            </div>
            <Button size="sm" icon={<Play size={14} />} onClick={triggerSync} disabled={!systemId}>立即同步</Button>
          </div>
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">该系统暂无同步任务</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {jobs.map((j) => (
                <div key={j.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-neutral-700">{j.id}</span>
                    <Badge color={statusColor[j.status] || 'neutral'} size="sm">{j.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    类型 {j.type} · 开始 {j.startedAt} · 记录 {j.records?.toLocaleString?.() ?? j.records ?? 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '编辑数据源' : '新增数据源'}
        subtitle={editing ? '更新源数据库连接信息' : '为一个系统填写源数据库连接信息'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>取消</Button>
            <Button onClick={save}>{editing ? '保存' : '创建'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">所属系统</label>
            <select value={form.sourceSystemId || ''} onChange={(e) => setField('sourceSystemId', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 outline-none">
              {systems.length === 0 && <option value="">暂无系统</option>}
              {systems.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">数据库类型</label>
            <select value={form.dbType || 'MYSQL'} onChange={(e) => setField('dbType', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 outline-none">
              {DB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">服务器地址</label>
              <input value={form.server || ''} onChange={(e) => setField('server', e.target.value)} placeholder="host.example.com" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">数据库名</label>
              <input value={form.databaseName || ''} onChange={(e) => setField('databaseName', e.target.value)} placeholder="db_name" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">连接凭据引用（密钥）</label>
            <input value={form.connectionSecretRef || ''} onChange={(e) => setField('connectionSecretRef', e.target.value)} placeholder="kv://your-secret" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">描述</label>
            <input value={form.description || ''} onChange={(e) => setField('description', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 outline-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
