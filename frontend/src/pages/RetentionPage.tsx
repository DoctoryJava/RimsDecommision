import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, Lock, Unlock, History, Pencil, Trash2, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import {
  getRetentionPolicies, createRetentionPolicy, updateRetentionPolicy, deleteRetentionPolicy,
  getRetentionAssignments, createRetentionAssignment, getRetentionHolds, holdRetention, releaseRetention,
} from '@/lib/api';

const statusColor: Record<string, 'success' | 'primary' | 'error' | 'warning' | 'neutral'> = {
  ACTIVE: 'success',
  EXPIRED: 'warning',
  COMPLETED: 'neutral',
  ON_HOLD: 'error',
};

export default function RetentionPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [holds, setHolds] = useState<any[]>([]);
  const [selAssn, setSelAssn] = useState<string | null>(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const [editingPol, setEditingPol] = useState<any>(null);
  const [polForm, setPolForm] = useState<any>({ startTrigger: 'SYNC_COMPLETED', periodDays: 2557 });
  const [showAssn, setShowAssn] = useState(false);
  const [assnForm, setAssnForm] = useState<any>({ objectType: 'SYSTEM', status: 'ACTIVE' });

  const load = useCallback(() => {
    getRetentionPolicies().then(setPolicies).catch(() => setPolicies([]));
    getRetentionAssignments().then(setAssignments).catch(() => setAssignments([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openPolCreate = () => { setEditingPol(null); setPolForm({ startTrigger: 'SYNC_COMPLETED', periodDays: 2557 }); setShowPolicy(true); };
  const openPolEdit = (p: any) => { setEditingPol(p); setPolForm({ ...p }); setShowPolicy(true); };
  const savePol = async () => {
    if (editingPol) await updateRetentionPolicy(editingPol.id, polForm);
    else await createRetentionPolicy(polForm);
    setShowPolicy(false);
    load();
  };
  const delPol = async (id: string) => {
    if (!window.confirm('确认删除该保留策略？')) return;
    await deleteRetentionPolicy(id);
    load();
  };

  const openAssn = () => { setAssnForm({ objectType: 'SYSTEM', status: 'ACTIVE' }); setShowAssn(true); };
  const saveAssn = async () => {
    await createRetentionAssignment(assnForm);
    setShowAssn(false);
    load();
  };

  const openHolds = async (id: string) => {
    setSelAssn(id);
    getRetentionHolds(id).then(setHolds).catch(() => setHolds([]));
  };
  const doHold = async (id: string) => {
    await holdRetention(id, { reason: '手动法定保留' });
    load(); openHolds(id);
  };
  const doRelease = async (id: string) => {
    await releaseRetention(id, { reason: '手动解除保留' });
    load(); openHolds(id);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="保留与合规"
        subtitle="管理保留策略、对象保留指派与法定保留（Legal Hold）"
        actions={
          <>
            <Button variant="outline" icon={<RefreshCw size={16} />} onClick={load}>刷新</Button>
            <Button variant="outline" icon={<Plus size={16} />} onClick={openAssn}>新建指派</Button>
            <Button icon={<Plus size={16} />} onClick={openPolCreate}>新增策略</Button>
          </>
        }
      />

      {/* Policies */}
      <Card className="overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary-500" />
          <h3 className="text-base font-semibold text-neutral-900">保留策略</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">编码</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">名称</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">保留天数</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">起算触发</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {policies.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50/50">
                <td className="px-5 py-3 text-sm font-mono text-neutral-700">{p.code}</td>
                <td className="px-5 py-3 text-sm font-medium text-neutral-800">{p.name}</td>
                <td className="px-5 py-3 text-sm text-neutral-600">{p.periodDays} 天</td>
                <td className="px-5 py-3 text-sm text-neutral-500">{p.startTrigger}</td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => openPolEdit(p)} className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"><Pencil size={14} /></button>
                    <button onClick={() => delPol(p.id)} className="p-1.5 rounded text-neutral-400 hover:text-error-500 hover:bg-neutral-100"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {policies.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">暂无保留策略</td></tr>}
          </tbody>
        </table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Assignments */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-neutral-900">保留指派</h3>
            <Badge color="neutral" size="sm">{assignments.length}</Badge>
          </div>
          <div className="divide-y divide-neutral-100">
            {assignments.map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-800">{a.objectType} · {a.objectId}</span>
                  <Badge color={statusColor[a.status] || 'neutral'} size="sm">{a.status}</Badge>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">起 {a.startDate} 至 {a.dueDate ?? '—'}</span>
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => openHolds(a.id)} className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100" title="查看保留事件"><History size={14} /></button>
                    {a.status !== 'ON_HOLD'
                      ? <button onClick={() => doHold(a.id)} className="p-1.5 rounded text-neutral-400 hover:text-error-500 hover:bg-neutral-100" title="执行法定保留"><Lock size={14} /></button>
                      : <button onClick={() => doRelease(a.id)} className="p-1.5 rounded text-neutral-400 hover:text-success-600 hover:bg-neutral-100" title="解除法定保留"><Unlock size={14} /></button>}
                  </div>
                </div>
              </div>
            ))}
            {assignments.length === 0 && <div className="px-5 py-10 text-center text-sm text-neutral-400">暂无保留指派</div>}
          </div>
        </Card>

        {/* Hold events */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
            <Lock size={16} className="text-primary-500" />
            <h3 className="text-base font-semibold text-neutral-900">法定保留事件</h3>
          </div>
          {selAssn ? (
            <div className="divide-y divide-neutral-100">
              {holds.map((h) => (
                <div key={h.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Badge color={h.action === 'HOLD' ? 'error' : 'success'} size="sm">{h.action}</Badge>
                    <span className="text-xs text-neutral-500">{h.ts}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-700">{h.reason || '—'}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">起 {h.holdStart ?? '—'} 至 {h.holdEnd ?? '生效中'} · 操作人 {h.actorId ?? '—'}</p>
                </div>
              ))}
              {holds.length === 0 && <div className="px-5 py-10 text-center text-sm text-neutral-400">该指派暂无保留事件</div>}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-neutral-400">在左侧指派上点击历史图标查看保留事件</div>
          )}
        </Card>
      </div>

      {/* Policy modal */}
      <Modal open={showPolicy} onClose={() => setShowPolicy(false)} title={editingPol ? '编辑保留策略' : '新增保留策略'} size="md"
        footer={<><Button variant="outline" onClick={() => setShowPolicy(false)}>取消</Button><Button onClick={savePol}>{editingPol ? '保存' : '创建'}</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">编码</label>
              <input value={polForm.code || ''} onChange={(e) => setPolForm((f: any) => ({ ...f, code: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">保留天数</label>
              <input type="number" value={polForm.periodDays ?? ''} onChange={(e) => setPolForm((f: any) => ({ ...f, periodDays: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">名称</label>
            <input value={polForm.name || ''} onChange={(e) => setPolForm((f: any) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">起算触发</label>
            <select value={polForm.startTrigger || 'SYNC_COMPLETED'} onChange={(e) => setPolForm((f: any) => ({ ...f, startTrigger: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none">
              <option value="SYNC_COMPLETED">同步完成日</option>
              <option value="INGESTION_DATE">入库日期</option>
              <option value="DEPLOYMENT_DATE">部署日期</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Assignment modal */}
      <Modal open={showAssn} onClose={() => setShowAssn(false)} title="新建保留指派" size="md"
        footer={<><Button variant="outline" onClick={() => setShowAssn(false)}>取消</Button><Button onClick={saveAssn}>创建</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">保留策略</label>
              <select value={assnForm.policyId || ''} onChange={(e) => setAssnForm((f: any) => ({ ...f, policyId: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none">
                <option value="">请选择</option>
                {policies.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">对象类型</label>
              <select value={assnForm.objectType || 'SYSTEM'} onChange={(e) => setAssnForm((f: any) => ({ ...f, objectType: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none">
                <option value="SYSTEM">系统</option>
                <option value="TABLE">表</option>
                <option value="FILE_SET">文件集</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">对象 ID</label>
            <input value={assnForm.objectId || ''} onChange={(e) => setAssnForm((f: any) => ({ ...f, objectId: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">起算日期</label>
            <input type="date" value={assnForm.startDate || ''} onChange={(e) => setAssnForm((f: any) => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
