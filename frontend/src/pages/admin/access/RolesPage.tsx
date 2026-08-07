import { useState, useEffect } from 'react';
import { Plus, ShieldCheck, Users, Lock, Pencil, Trash2, Server, Building2, Crown, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { roles as mockRoles, permissions as mockPermissions } from '@/data/mockData';
import type { RoleCategory } from '@/types';
import { getSystems, getUsers, getRoles, getPermissions, getPages, getSystemStats, getSyncJobs, getSchemas, getTables, getQueryConfigs } from '@/lib/api'; // Phase 1-5 API integration (fallback to mockData)

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
  // Phase 1-5: API integration - try backend, fallback to mockData if unreachable
  useEffect(() => {
    getRoles({ pageNum: 1, pageSize: 100 } as any).then((res: any) => {
      const list = (res as any)?.list ?? (res as any) ?? [];
      if (Array.isArray(list) && list.length) console.log('[API] RolesPage.tsx fetched', list.length);
      // TODO: set state with API data, e.g. setRoles(list) - keep mock as fallback for now
    }).catch(e => console.warn('[API] RolesPage.tsx fallback to mockData', e));
  }, []);
  const [activeTab, setActiveTab] = useState<RoleCategory>('admin');
  const [selectedRoleId, setSelectedRoleId] = useState<string>(mockRoles[0].id);
  const [rolesData, setRolesData] = useState(mockRoles);
  const [permsData, setPermsData] = useState(mockPermissions);
  useEffect(() => {
    getRoles().then(list => { if(list?.length) setRolesData(list as any); }).catch(()=>{});
    getPermissions().then(list => { if(list?.length) setPermsData(list as any); }).catch(()=>{});
  }, []);

  const filteredRoles = rolesData.filter((r) => r.category === activeTab);
  const selectedRole = rolesData.find((r) => r.id === selectedRoleId) || filteredRoles[0] || rolesData[0];

  const rolePerms = selectedRole.permissions.includes('*')
    ? permsData.filter((p) => p.category === selectedRole.category)
    : permsData.filter((p) => selectedRole.permissions.includes(p.code));

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
                <Button variant="outline" size="sm" icon={<Pencil size={14} />}>Edit</Button>
                {!selectedRole.isBuiltin && (
                  <Button variant="danger" size="sm" icon={<Trash2 size={14} />}>Delete</Button>
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

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New Role"
        subtitle="Define a new role and assign permissions"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button>Create Role</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Role Category</label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer transition-all has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50">
                <input type="radio" name="roleCategory" defaultChecked className="w-4 h-4 text-primary-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-800">Platform Admin</p>
                  <p className="text-xs text-neutral-500">Global access to all systems</p>
                </div>
              </label>
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-neutral-200 hover:border-secondary-300 hover:bg-secondary-50/30 cursor-pointer transition-all has-[:checked]:border-secondary-400 has-[:checked]:bg-secondary-50">
                <input type="radio" name="roleCategory" className="w-4 h-4 text-secondary-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-800">System Tenant</p>
                  <p className="text-xs text-neutral-500">Scoped to assigned systems only</p>
                </div>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Role Name</label>
              <input type="text" placeholder="e.g. Data Analyst" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Role Key</label>
              <input type="text" placeholder="e.g. data_analyst" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Description</label>
            <textarea rows={2} placeholder="Describe what this role can do..." className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Permissions</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto border border-neutral-200 rounded-lg p-3">
              {permsData.map((perm) => (
                <label key={perm.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors">
                  <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-200" />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-700">{perm.name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{perm.code}</p>
                  </div>
                  <Badge color={perm.category === 'admin' ? 'primary' : 'secondary'} size="sm">{perm.category}</Badge>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}