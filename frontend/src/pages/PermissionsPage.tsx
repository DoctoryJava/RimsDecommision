import { useState, useEffect } from 'react';
import { Key, Search, Crown, Building2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PageHeader from '@/components/ui/PageHeader';
import { permissions as mockPermissions } from '@/data/mockData';
import type { PermissionRecord, PermissionCategory } from '@/types';
import { getSystems, getUsers, getRoles, getPermissions, getPages, getSystemStats, getSyncJobs, getSchemas, getTables, getQueryConfigs } from '@/lib/api'; // Phase 1-5 API integration (fallback to mockData)

const moduleColorMap: Record<string, 'primary' | 'secondary' | 'accent' | 'warning' | 'error' | 'neutral'> = {
  systems: 'primary',
  users: 'secondary',
  roles: 'accent',
  data: 'warning',
  pages: 'neutral',
  settings: 'error',
  schemas: 'secondary',
};

const actionColorMap: Record<string, 'success' | 'warning' | 'error' | 'primary' | 'secondary' | 'neutral'> = {
  view: 'neutral',
  create: 'success',
  edit: 'primary',
  delete: 'error',
  sync: 'warning',
  export: 'secondary',
};

// TODO Phase 1-5: replace mockData with api calls in useEffect (fallback to mock if API unreachable)
export default function PermissionsPage() {
  const [permsData, setPermsData] = useState(mockPermissions);
  useEffect(() => { getPermissions().then(list => { if(list?.length) setPermsData(list as any); }).catch(()=>{}); }, []);
  const [search, setSearch] = useState('');
  // Phase 1-5: API integration - try backend, fallback to mockData if unreachable
  useEffect(() => {
    getPermissions({ pageNum: 1, pageSize: 100 } as any).then((res: any) => {
      const list = (res as any)?.list ?? (res as any) ?? [];
      if (Array.isArray(list) && list.length) console.log('[API] PermissionsPage.tsx fetched', list.length);
      // TODO: set state with API data, e.g. setPermissions(list) - keep mock as fallback for now
    }).catch(e => console.warn('[API] PermissionsPage.tsx fallback to mockData', e));
  }, []);
  const [categoryFilter, setCategoryFilter] = useState<PermissionCategory | 'all'>('all');

  const filtered = permsData.filter((p) => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const adminPerms = filtered.filter((p) => p.category === 'admin');
  const tenantPerms = filtered.filter((p) => p.category === 'tenant');

  return (
    <div className="p-6">
      <!-- API Integration: this page now has backend /api/* ready, frontend will call via src/lib/api.ts with fallback to mockData -->
      <PageHeader title="Permissions" subtitle="All available permissions, organized by access tier: platform admin vs system tenant" />

      {/* Category filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permissions..."
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
              {f === 'all' ? 'All' : f === 'admin' ? 'Platform Admin' : 'System Tenant'}
            </button>
          ))}
        </div>
      </div>

      {/* Admin permissions section */}
      {(categoryFilter === 'all' || categoryFilter === 'admin') && adminPerms.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
              <Crown size={16} className="text-primary-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Platform Admin Permissions</h3>
              <p className="text-xs text-neutral-500">Global access — manage all systems, users, and configuration</p>
            </div>
            <Badge color="primary" size="sm" variant="soft">{adminPerms.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {adminPerms.map((perm) => (
              <PermissionCard key={perm.id} perm={perm} />
            ))}
          </div>
        </div>
      )}

      {/* Tenant permissions section */}
      {(categoryFilter === 'all' || categoryFilter === 'tenant') && tenantPerms.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-secondary-50 flex items-center justify-center">
              <Building2 size={16} className="text-secondary-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">System Tenant Permissions</h3>
              <p className="text-xs text-neutral-500">Scoped access — limited to the user's assigned systems only</p>
            </div>
            <Badge color="secondary" size="sm" variant="soft">{tenantPerms.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tenantPerms.map((perm) => (
              <PermissionCard key={perm.id} perm={perm} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <Key size={48} className="mx-auto text-neutral-300 mb-4" />
          <p className="text-neutral-500">No permissions found matching your filters.</p>
        </div>
      )}
    </div>
  );
}

function PermissionCard({ perm }: { perm: PermissionRecord }) {
  const isTenant = perm.category === 'tenant';
  return (
    <Card hover className={`p-4 ${isTenant ? 'border-l-4 border-l-secondary-300' : 'border-l-4 border-l-primary-300'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isTenant ? 'bg-secondary-50' : 'bg-primary-50'}`}>
            <Key size={16} className={isTenant ? 'text-secondary-500' : 'text-primary-500'} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{perm.name}</p>
            <p className="text-xs text-neutral-500 font-mono">{perm.code}</p>
          </div>
        </div>
        <Badge color={actionColorMap[perm.action]} size="sm">{perm.action}</Badge>
      </div>
      <p className="text-xs text-neutral-500 mt-2">{perm.description}</p>
      <div className="mt-2.5 flex items-center gap-1.5">
        <Badge color={isTenant ? 'secondary' : 'primary'} size="sm" variant="soft">
          {isTenant ? 'Tenant-scoped' : 'Platform-wide'}
        </Badge>
        <Badge color={moduleColorMap[perm.module] || 'neutral'} size="sm" variant="soft">{perm.module}</Badge>
      </div>
    </Card>
  );
}