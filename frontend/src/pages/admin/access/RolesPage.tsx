import { useState, useEffect } from 'react';
import { Plus, ShieldCheck, Users, Lock, Pencil, Trash2, Server, Building2, Crown, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import type { RoleCategory } from '@/types';
import { getRoles, getPermissions, createRole, updateRole, updateRolePermissions, deleteRole } from '@/lib/api';

const roleColorMap: Record<string, 'primary' | 'secondary' | 'accent' | 'warning' | 'error' | 'neutral'> = {
  primary: 'primary',
  secondary: 'secondary',
  accent: 'accent',
  warning: 'warning',
  error: 'error',
  neutral: 'neutral',
};

const colorBg: Record<string, string> = {
  primary: 'bg-primary-50 text-primary-600',
  secondary: 'bg-secondary-50 text-secondary-600',
  accent: 'bg-accent-50 text-accent-600',
  warning: 'bg-warning-50 text-warning-600',
  error: 'bg-error-50 text-error-600',
  neutral: 'bg-neutral-100 text-neutral-600',
};

// TODO Phase 1-5: replace mockData with api calls in useEffect (fallback to mock if API unreachable)
export default function RolesPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRole, setEditRole] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<RoleCategory>('admin');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [rolesData, setRolesData] = useState<any[]>([]);
  const [permsData, setPermsData] = useState<any[]>([]);

  const loadRoles = () => {
    getRoles().then((list: any) => { if(list?.length) setRolesData(list as any[]); }).catch(()=>{});
  };
  useEffect(() => {
    loadRoles();
    getPermissions().then((list: any) => { if(list?.length) setPermsData(list as any[]); }).catch(()=>{});
  }, []);

  const filteredRoles = rolesData.filter((r) => r.category === activeTab);
  const selectedRole = rolesData.find((r) => r.id === selectedRoleId) || filteredRoles[0] || rolesData[0]
    || { id: '', name: '—', description: '请选择角色', category: activeTab, permissions: [], userCount: 0, color: 'neutral', isBuiltin: false };

  const rolePerms = (selectedRole.permissions || []).includes('*')
    ? permsData.filter((p) => p.category === selectedRole.category)
    : permsData.filter((p) => (selectedRole.permissions || []).includes(p.code));

  const handleTabChange = (tab: RoleCategory) => {
    setActiveTab(tab);
    const firstInTab = rolesData.find((r) => r.category === tab);
    if (firstInTab) setSelectedRoleId(firstInTab.id);
  };

  return (
    <div className="p-6">
      {/* API Integration: this page now has backend /api/* ready, frontend will call via src/lib/api.ts with fallback to mockData */}
      <PageHeader
        title="Roles"
        subtitle="Two-tier access: platform admins manage the entire platform; system tenants only see their assigned systems."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setShowAddModal(true)}>Create Role</Button>
        }
      />

      {/* Concept explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Card className="p-4 border-l-4 border-l-primary-500">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <Crown size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Platform Admin Roles</p>
              <p className="text-xs text-neutral-500 mt-0.5">Full access to manage all systems, users, roles, and global configuration across the entire platform.</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-secondary-500">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-50 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-secondary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">System Tenant Roles</p>
              <p className="text-xs text-neutral-500 mt-0.5">Scoped to assigned systems only. Users see only their own system's data, schemas, and sync history.</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-neutral-200">
        {(['admin', 'tenant'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              activeTab === tab ? 'text-primary-600' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab === 'admin' ? 'Platform Admin' : 'System Tenant'}
            <span className="ml-1.5 text-xs text-neutral-400">({rolesData.filter((r) => r.category === tab).length})</span>
            {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Role list */}
        <div className="space-y-3">
          {filteredRoles.map((role) => {
            const isSelected = selectedRole.id === role.id;
            return (
              <Card
                key={role.id}
                hover
                className={`p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary-400 border-primary-300' : ''}`}
              >
                <div onClick={() => setSelectedRoleId(role.id)}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorBg[role.color]}`}>
                      {role.category === 'admin' ? <Crown size={20} /> : <Building2 size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-neutral-900 truncate">{role.name}</h3>
                        {role.isBuiltin && <Badge color="neutral" size="sm">Built-in</Badge>}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">{role.userCount} {role.userCount === 1 ? 'user' : 'users'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Role detail */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${colorBg[selectedRole.color]}`}>
                  {selectedRole.category === 'admin' ? <Crown size={22} /> : <Building2 size={22} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-neutral-900">{selectedRole.name}</h3>
                    <Badge color={selectedRole.category === 'admin' ? 'primary' : 'secondary'} size="sm">
                      {selectedRole.category === 'admin' ? 'Platform Admin' : 'System Tenant'}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-500 mt-0.5">{selectedRole.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" icon={<Pencil size={14} />} onClick={() => setEditRole(selectedRole)}>Edit</Button>
                {!selectedRole.isBuiltin && (
                  <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={async () => {
                    if (!window.confirm(`确认删除角色 ${selectedRole.name}？`)) return;
                    try { await deleteRole(selectedRole.id); loadRoles(); } catch (e: any) { window.alert('删除失败：' + (e?.message || '请稍后重试')); }
                  }}>Delete</Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-neutral-50 text-center">
                <Users size={18} className="mx-auto text-neutral-400 mb-1" />
                <p className="text-lg font-semibold text-neutral-900">{selectedRole.userCount}</p>
                <p className="text-xs text-neutral-500">Users</p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 text-center">
                <Lock size={18} className="mx-auto text-neutral-400 mb-1" />
                <p className="text-lg font-semibold text-neutral-900">{rolePerms.length}</p>
                <p className="text-xs text-neutral-500">Permissions</p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 text-center">
                <Server size={18} className="mx-auto text-neutral-400 mb-1" />
                <p className="text-lg font-semibold text-neutral-900">{selectedRole.category === 'tenant' ? 'Scoped' : 'Global'}</p>
                <p className="text-xs text-neutral-500">Access Scope</p>
              </div>
            </div>

            {selectedRole.category === 'tenant' && (
              <div className="mb-4 p-3 rounded-lg bg-secondary-50 border border-secondary-100 flex items-start gap-2.5">
                <Info size={16} className="text-secondary-600 shrink-0 mt-0.5" />
                <p className="text-xs text-secondary-700">
                  This is a <span className="font-semibold">system-scoped role</span>. Users with this role can only access systems explicitly assigned to them. They cannot see other systems, global users, or platform-wide settings.
                </p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-3">Permissions ({rolePerms.length})</h4>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {rolePerms.map((perm) => (
                  <div key={perm.id} className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-primary-50 flex items-center justify-center">
                        <Lock size={14} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-800">{perm.name}</p>
                        <p className="text-xs text-neutral-500 font-mono">{perm.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="neutral" size="sm">{perm.module}</Badge>
                      <Badge color={perm.category === 'admin' ? 'primary' : 'secondary'} size="sm">{perm.action}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {showAddModal && (
        <RoleFormModal
          mode="create"
          permsData={permsData}
          onClose={() => setShowAddModal(false)}
          onSaved={async () => { setShowAddModal(false); loadRoles(); }}
        />
      )}

      {editRole && (
        <RoleFormModal
          mode="edit"
          role={editRole}
          permsData={permsData}
          onClose={() => setEditRole(null)}
          onSaved={async () => { setEditRole(null); loadRoles(); }}
        />
      )}
    </div>
  );
}

// 角色表单弹窗：新建 / 编辑（基本信息 + 权限关联）
function RoleFormModal({
  mode, role, permsData, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  role?: any;
  permsData: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = mode === 'create';
  const [name, setName] = useState(role?.name || '');
  const [key, setKey] = useState(role?.key || role?.roleKey || '');
  const [description, setDescription] = useState(role?.description || '');
  const [category, setCategory] = useState<RoleCategory>(role?.category || 'admin');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || []);
  const [color, setColor] = useState(role?.color || 'primary');
  const [saving, setSaving] = useState(false);

  const togglePerm = (code: string) => {
    setPermissions(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const handleSave = async () => {
    if (!name.trim() || !key.trim()) { window.alert('请填写角色名称和 Key'); return; }
    setSaving(true);
    try {
      const base = { name, key, roleKey: key, description, category, color, userCount: role?.userCount || 0 };
      if (isCreate) {
        await createRole({ ...base, permissions, isBuiltin: false });
      } else {
        await updateRole(role.id, base);
        await updateRolePermissions(role.id, permissions);
      }
      onSaved();
    } catch (e: any) {
      window.alert('保存失败：' + (e?.message || '请稍后重试'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isCreate ? 'Create New Role' : `Edit Role: ${role?.name || ''}`}
      subtitle={isCreate ? 'Define a new role and assign permissions' : '修改角色信息与权限关联'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button icon={<Pencil size={16} />} disabled={saving} onClick={handleSave}>
            {isCreate ? 'Create Role' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Role Category</label>
          <div className="grid grid-cols-2 gap-2">
            {(['admin', 'tenant'] as const).map((cat) => (
              <label key={cat} className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${category === cat ? 'border-primary-400 bg-primary-50' : 'border-neutral-200 hover:border-primary-300'}`}>
                <input type="radio" checked={category === cat} onChange={() => setCategory(cat)} className="w-4 h-4 text-primary-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-800">{cat === 'admin' ? 'Platform Admin' : 'System Tenant'}</p>
                  <p className="text-xs text-neutral-500">{cat === 'admin' ? 'Global access to all systems' : 'Scoped to assigned systems only'}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Role Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data Analyst" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Role Key</label>
            <input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. data_analyst" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 outline-none font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this role can do..." className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 outline-none resize-none" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-neutral-700">Permissions</label>
            <div className="flex items-center gap-2 text-xs">
              <button type="button" onClick={() => setPermissions(permsData.map(p => p.code))} className="text-primary-500 hover:underline">全选</button>
              <span className="text-neutral-300">·</span>
              <button type="button" onClick={() => setPermissions([])} className="text-neutral-500 hover:underline">清空</button>
              <Badge color="primary" size="sm">{permissions.length} 已选</Badge>
            </div>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto border border-neutral-200 rounded-lg p-3">
            {permsData.map((perm) => {
              const checked = permissions.includes(perm.code);
              return (
                <label key={perm.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-primary-50/60' : 'hover:bg-neutral-50'}`}>
                  <input type="checkbox" checked={checked} onChange={() => togglePerm(perm.code)} className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-200" />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-700">{perm.name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{perm.code}</p>
                  </div>
                  <Badge color={perm.category === 'admin' ? 'primary' : 'secondary'} size="sm">{perm.category}</Badge>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}