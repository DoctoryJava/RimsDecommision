import { useState, useEffect, useCallback } from 'react';
import { Tag as TagIcon, Plus, Trash2, Link2, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { getTags, createTag, deleteTag, getObjectTags, assignObjectTag, deleteObjectTag, getSystems } from '@/lib/api';

const OBJ_TYPES = ['SYSTEM', 'TABLE', 'FILE_SET', 'UNSTRUCTURED_SOURCE'];

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [objTags, setObjTags] = useState<any[]>([]);
  const [systems, setSystems] = useState<any[]>([]);
  const [showTag, setShowTag] = useState(false);
  const [tagForm, setTagForm] = useState({ tagKey: '', tagValue: '' });
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ objectType: 'SYSTEM', objectId: '', tagId: '' });

  const loadTags = useCallback(() => {
    getTags().then(setTags).catch(() => setTags([]));
    getObjectTags().then(setObjTags).catch(() => setObjTags([]));
  }, []);
  const loadSystems = useCallback(() => {
    getSystems({ pageNum: 1, pageSize: 100 }).then((p: any) => setSystems((p?.list ?? []) as any[])).catch(() => setSystems([]));
  }, []);

  useEffect(() => { loadTags(); loadSystems(); }, [loadTags, loadSystems]);

  const saveTag = async () => {
    await createTag(tagForm);
    setShowTag(false);
    setTagForm({ tagKey: '', tagValue: '' });
    loadTags();
  };
  const delTag = async (id: string) => {
    if (!window.confirm('删除标签将同时移除其所有对象关联，确认？')) return;
    await deleteTag(id);
    loadTags();
  };

  const saveAssign = async () => {
    await assignObjectTag(assignForm);
    setShowAssign(false);
    setAssignForm({ objectType: 'SYSTEM', objectId: '', tagId: '' });
    loadTags();
  };
  const delObjTag = async (id: string) => {
    await deleteObjectTag(id);
    loadTags();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="标签管理"
        subtitle="管理标签键值，并将标签关联到系统、表、文件集等对象"
        actions={
          <>
            <Button variant="outline" icon={<RefreshCw size={16} />} onClick={loadTags}>刷新</Button>
            <Button variant="outline" icon={<Link2 size={16} />} onClick={() => setShowAssign(true)}>关联对象</Button>
            <Button icon={<Plus size={16} />} onClick={() => setShowTag(true)}>新增标签</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tags */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
            <TagIcon size={16} className="text-primary-500" />
            <h3 className="text-base font-semibold text-neutral-900">标签</h3>
          </div>
          <div className="divide-y divide-neutral-100">
            {tags.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge color="primary" variant="soft" size="sm">{t.tagKey}</Badge>
                  <span className="text-sm text-neutral-700">{t.tagValue}</span>
                </div>
                <button onClick={() => delTag(t.id)} className="p-1.5 rounded text-neutral-400 hover:text-error-500 hover:bg-neutral-100"><Trash2 size={14} /></button>
              </div>
            ))}
            {tags.length === 0 && <div className="px-5 py-10 text-center text-sm text-neutral-400">暂无标签</div>}
          </div>
        </Card>

        {/* Object tags */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
            <Link2 size={16} className="text-primary-500" />
            <h3 className="text-base font-semibold text-neutral-900">对象标签关联</h3>
          </div>
          <div className="divide-y divide-neutral-100">
            {objTags.map((o) => (
              <div key={o.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400 uppercase">{o.objectType}</span>
                    <span className="text-sm font-mono text-neutral-700">{o.objectId}</span>
                  </div>
                  <div className="mt-1"><Badge color="neutral" variant="soft" size="sm">{o.tagKey}{o.tagValue ? '=' + o.tagValue : ''}</Badge></div>
                </div>
                <button onClick={() => delObjTag(o.id)} className="p-1.5 rounded text-neutral-400 hover:text-error-500 hover:bg-neutral-100"><Trash2 size={14} /></button>
              </div>
            ))}
            {objTags.length === 0 && <div className="px-5 py-10 text-center text-sm text-neutral-400">暂无对象标签关联</div>}
          </div>
        </Card>
      </div>

      {/* Create tag modal */}
      <Modal open={showTag} onClose={() => setShowTag(false)} title="新增标签" size="sm"
        footer={<><Button variant="outline" onClick={() => setShowTag(false)}>取消</Button><Button onClick={saveTag}>创建</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">标签键</label>
            <input value={tagForm.tagKey} onChange={(e) => setTagForm((f) => ({ ...f, tagKey: e.target.value }))} placeholder="如 category / critical / pii" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">标签值</label>
            <input value={tagForm.tagValue} onChange={(e) => setTagForm((f) => ({ ...f, tagValue: e.target.value }))} placeholder="如 commerce / true" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none" />
          </div>
        </div>
      </Modal>

      {/* Assign modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="关联对象标签" size="md"
        footer={<><Button variant="outline" onClick={() => setShowAssign(false)}>取消</Button><Button onClick={saveAssign}>关联</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">对象类型</label>
              <select value={assignForm.objectType} onChange={(e) => setAssignForm((f) => ({ ...f, objectType: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none">
                {OBJ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">标签</label>
              <select value={assignForm.tagId} onChange={(e) => setAssignForm((f) => ({ ...f, tagId: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none">
                <option value="">请选择</option>
                {tags.map((t) => <option key={t.id} value={t.id}>{t.tagKey}={t.tagValue || ''}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">对象</label>
            {assignForm.objectType === 'SYSTEM' ? (
              <select value={assignForm.objectId} onChange={(e) => setAssignForm((f) => ({ ...f, objectId: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none">
                <option value="">请选择系统</option>
                {systems.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            ) : (
              <input value={assignForm.objectId} onChange={(e) => setAssignForm((f) => ({ ...f, objectId: e.target.value }))} placeholder="对象 ID" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none" />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
