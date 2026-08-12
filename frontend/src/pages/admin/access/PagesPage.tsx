import { useState, useEffect } from 'react';
import { Plus, FileText, Eye, EyeOff, ArrowUp, ArrowDown, GripVertical, Save } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import type { RoleKey, PageRecord } from '@/types';
import { getPages, updatePage } from '@/lib/api';

const roleLabelMap: Record<RoleKey, string> = {
  super_admin: 'Super Admin',
  platform_admin: 'Platform Admin',
  security_admin: 'Security Admin',
  system_owner: 'System Owner',
  system_engineer: 'System Engineer',
  system_auditor: 'System Auditor',
  system_viewer: 'System Viewer',
};

const roleKeys: RoleKey[] = ['super_admin', 'platform_admin', 'security_admin', 'system_owner', 'system_engineer', 'system_auditor', 'system_viewer'];

// TODO Phase 1-5: replace mockData with api calls in useEffect (fallback to mock if API unreachable)
export default function PagesPage() {
  const [pageList, setPageList] = useState<PageRecord[]>([]);
  useEffect(() => {
    getPages().then(list => { if(list?.length) setPageList(list as unknown as PageRecord[]); }).catch(()=>{});
  }, []);

  const move = (index: number, dir: 'up' | 'down') => {
    if (dir === 'up' && index === 0) return;
    if (dir === 'down' && index === pageList.length - 1) return;
    const newList = [...pageList];
    const swapIndex = dir === 'up' ? index - 1 : index + 1;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    newList.forEach((p, i) => (p.order = i + 1));
    setPageList(newList);
  };

  const toggleEnabled = (id: string) => {
    setPageList(pageList.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  // 切换某个页面某个角色是否可见
  const toggleRole = (pageId: string, roleKey: RoleKey) => {
    setPageList(pageList.map((p) => {
      if (p.id !== pageId) return p;
      const cur = p.visibleTo || [];
      const next = cur.includes(roleKey) ? cur.filter((r) => r !== roleKey) : [...cur, roleKey];
      return { ...p, visibleTo: next };
    }));
  };

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // 保存单页的 visibleTo / enabled / order 到后端
  const savePage = async (page: PageRecord) => {
    setSaving(true); setSavedMsg('');
    try {
      await updatePage(page.id, { visibleTo: page.visibleTo || [], enabled: page.enabled, sortOrder: page.order });
      setSavedMsg(`已保存「${page.name}」的可见配置`);
    } catch (e: any) {
      setSavedMsg('保存失败：' + (e?.message || '请稍后重试'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* API Integration: this page now has backend /api/* ready, frontend will call via src/lib/api.ts with fallback to mockData */}
      <PageHeader
        title="Page Management"
        subtitle="Configure which pages are visible to which roles, and their display order"
        actions={
          <Button icon={<Plus size={16} />}>Add Page</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Page list */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider w-10"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Page</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Module</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Path</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageList.map((page, index) => (
                  <tr key={page.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3 text-neutral-300">
                      <GripVertical size={16} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-neutral-500 w-6 inline-block">{page.order}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <FileText size={15} className="text-neutral-500" />
                        </div>
                        <span className="text-sm font-medium text-neutral-900">{page.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="neutral" size="sm">{page.module}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500 font-mono">{page.path}</td>
                    <td className="px-4 py-3">
                      <Badge color={page.enabled ? 'success' : 'neutral'} dot>{page.enabled ? 'Enabled' : 'Hidden'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => move(index, 'up')} disabled={index === 0} className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ArrowUp size={14} />
                        </button>
                        <button onClick={() => move(index, 'down')} disabled={index === pageList.length - 1} className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ArrowDown size={14} />
                        </button>
                        <button onClick={() => toggleEnabled(page.id)} className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                          {page.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Role visibility matrix */}
        <div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-neutral-900">Role Visibility</h3>
              {savedMsg && <span className="text-xs text-neutral-500">{savedMsg}</span>}
            </div>
            <p className="text-xs text-neutral-500 mb-4">勾选哪些角色可以看到该页面，保存后侧栏按角色动态显示</p>
            <div className="space-y-2">
              {pageList.map((page) => (
                <div key={page.id} className="p-3 rounded-lg border border-neutral-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-neutral-800">{page.name}</p>
                    <button
                      onClick={() => savePage(page)}
                      disabled={saving}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-primary-600 hover:bg-primary-50 disabled:opacity-50 transition-colors"
                    >
                      <Save size={12} /> 保存
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {roleKeys.map((rk) => {
                      const checked = (page.visibleTo ?? []).includes(rk);
                      return (
                        <label
                          key={rk}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                            checked ? 'bg-primary-50 text-primary-700' : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                          }`}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleRole(page.id, rk)} className="w-3 h-3 rounded text-primary-500" />
                          {roleLabelMap[rk]}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}