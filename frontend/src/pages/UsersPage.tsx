import { useState } from 'react';
import {
  Plus,
  Search,
  MoreVertical,
  Mail,
  Server,
  Crown,
  Building2,
  Eye,
  Pencil,
  Trash2,
  UserPlus,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { users, systems, roles } from '@/data/mockData';
import type { RoleKey, RoleCategory } from '@/types';

const roleColorMap: Record<RoleKey, 'primary' | 'secondary' | 'accent' | 'warning' | 'error' | 'neutral'> = {
  super_admin: 'primary',
  platform_admin: 'secondary',
  security_admin: 'error',
  system_owner: 'secondary',
  system_engineer: 'accent',
  system_auditor: 'warning',
  system_viewer: 'neutral',
};

const roleLabelMap: Record<RoleKey, string> = {
  super_admin: 'Super Admin',
  platform_admin: 'Platform Admin',
  security_admin: 'Security Admin',
  system_owner: 'System Owner',
  system_engineer: 'System Engineer',
  system_auditor: 'System Auditor',
  system_viewer: 'System Viewer',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RoleCategory | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    if (categoryFilter !== 'all' && u.category !== categoryFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const adminCount = users.filter((u) => u.category === 'admin').length;
  const tenantCount = users.filter((u) => u.category === 'tenant').length;

  return (
    <div className="p-6">
      <PageHeader
        title="Users"
        subtitle="Manage user accounts. Admin users have global access; tenant users are scoped to assigned systems."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setShowAddModal(true)}>Invite User</Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Crown size={20} className="text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-neutral-900">{adminCount}</p>
            <p className="text-xs text-neutral-500">Platform Admin Users</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary-50 flex items-center justify-center">
            <Building2 size={20} className="text-secondary-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-neutral-900">{tenantCount}</p>
            <p className="text-xs text-neutral-500">System Tenant Users</p>
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
            placeholder="Search users by name or email..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'admin', 'tenant'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setCategoryFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                categoryFilter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {f === 'all' ? 'All Users' : f === 'admin' ? 'Admin' : 'Tenant'}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Tier</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Assigned Systems</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Last Login</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((user) => {
              const userSystems = systems.filter((s) => user.systemIds.includes(s.id));
              const isAdmin = user.category === 'admin';
              return (
                <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 ${isAdmin ? 'bg-gradient-to-br from-primary-400 to-primary-600' : 'bg-gradient-to-br from-secondary-400 to-secondary-600'}`}>
                        {user.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                        <p className="text-xs text-neutral-500 flex items-center gap-1"><Mail size={11} /> {user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700">
                        <Crown size={13} /> Platform Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary-700">
                        <Building2 size={13} /> System Tenant
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={roleColorMap[user.role]}>{roleLabelMap[user.role]}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {isAdmin ? (
                      <span className="text-xs text-neutral-400 italic">All systems (global)</span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap max-w-[200px]">
                        {userSystems.length > 0 ? (
                          <>
                            {userSystems.slice(0, 3).map((s) => (
                              <span key={s.id} className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-mono">{s.code}</span>
                            ))}
                            {userSystems.length > 3 && <span className="text-xs text-neutral-500">+{userSystems.length - 3}</span>}
                          </>
                        ) : (
                          <span className="text-xs text-neutral-400">No systems assigned</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={user.status === 'active' ? 'success' : 'neutral'} dot>{user.status === 'active' ? 'Active' : 'Disabled'}</Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-neutral-500">{user.lastLogin || 'Never'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="relative inline-block">
                      <button onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                      {openMenu === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-10 animate-scale-in">
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"><Eye size={14} /> View</button>
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"><Pencil size={14} /> Edit</button>
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 transition-colors"><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Invite New User"
        subtitle="Send an invitation to join the platform"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button icon={<UserPlus size={16} />}>Send Invitation</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Full Name</label>
              <input type="text" placeholder="e.g. John Smith" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email Address</label>
              <input type="email" placeholder="john@company.com" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Access Tier</label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer transition-all has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50">
                <input type="radio" name="userCategory" value="admin" className="w-4 h-4 text-primary-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-800 flex items-center gap-1.5"><Crown size={14} /> Platform Admin</p>
                  <p className="text-xs text-neutral-500">Global access to all systems</p>
                </div>
              </label>
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-neutral-200 hover:border-secondary-300 hover:bg-secondary-50/30 cursor-pointer transition-all has-[:checked]:border-secondary-400 has-[:checked]:bg-secondary-50">
                <input type="radio" name="userCategory" value="tenant" defaultChecked className="w-4 h-4 text-secondary-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-800 flex items-center gap-1.5"><Building2 size={14} /> System Tenant</p>
                  <p className="text-xs text-neutral-500">Scoped to assigned systems</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Role</label>
            <select className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all">
              {roles.filter((r) => r.key !== 'super_admin').map((r) => (
                <option key={r.key} value={r.key}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Assign Systems <span className="text-xs text-neutral-400 font-normal">(tenant users only)</span></label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-neutral-200 rounded-lg p-3">
              {systems.map((s) => (
                <label key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors">
                  <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-200" />
                  <div className="flex items-center gap-2">
                    <Server size={16} className="text-neutral-400" />
                    <span className="text-sm text-neutral-700">{s.name}</span>
                    <span className="text-xs text-neutral-400 font-mono">{s.code}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
