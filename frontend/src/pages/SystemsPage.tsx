import { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ArrowLeft,
  Database,
  HardDrive,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Pencil,
  Trash2,
  Archive,
  Tag,
  User as UserIcon,
  Building2,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { systems } from '@/data/mockData';
import type { SystemRecord, LifecycleStage, SyncStatus } from '@/types';
import { getSystems, getUsers, getRoles, getPermissions, getPages, getSystemStats, getSyncJobs, getSchemas, getTables, getQueryConfigs } from '@/lib/api'; // Phase 1-5 API integration (fallback to mockData)

const stageMap: Record<LifecycleStage, { color: 'success' | 'warning' | 'neutral' | 'error'; label: string }> = {
  active: { color: 'success', label: 'Active' },
  deprecated: { color: 'warning', label: 'Deprecated' },
  archived: { color: 'neutral', label: 'Archived' },
  destroyed: { color: 'error', label: 'Destroyed' },
};

const syncStatusMap: Record<SyncStatus, { color: 'success' | 'warning' | 'error' | 'primary' | 'neutral'; label: string }> = {
  success: { color: 'success', label: 'Success' },
  syncing: { color: 'primary', label: 'Syncing' },
  failed: { color: 'error', label: 'Failed' },
  partial: { color: 'warning', label: 'Partial' },
  idle: { color: 'neutral', label: 'Idle' },
};

interface SystemsPageProps {
  onNavigateSystems: () => void;
}

// TODO Phase 1-5: replace mockData with api calls in useEffect (fallback to mock if API unreachable)
export default function SystemsPage({ onNavigateSystems }: SystemsPageProps) {
  const [selectedSystem, setSelectedSystem] = useState<SystemRecord | null>(null);
  const [filter, setFilter] = useState<LifecycleStage | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = systems.filter((s) => {
    if (filter !== 'all' && s.stage !== filter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (selectedSystem) {
    return <SystemDetail system={selectedSystem} onBack={() => setSelectedSystem(null)} />;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Systems"
        subtitle="Manage the lifecycle of all registered systems and their data retention"
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setShowAddModal(true)}>
            Register System
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'active', 'deprecated', 'archived', 'destroyed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                filter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {f === 'all' ? 'All' : stageMap[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* System cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((system) => {
          const stage = stageMap[system.stage];
          const sync = syncStatusMap[system.syncStatus];
          return (
            <Card key={system.id} hover className="p-5 cursor-pointer animate-fade-in-up" >
              <div onClick={() => setSelectedSystem(system)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                      <Server size={20} className="text-neutral-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900 leading-tight">{system.name}</h3>
                      <p className="text-xs text-neutral-500 mt-0.5">{system.code} · {system.department}</p>
                    </div>
                  </div>
                  <Badge color={stage.color} dot>{stage.label}</Badge>
                </div>

                <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{system.description}</p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-lg bg-neutral-50">
                    <p className="text-lg font-semibold text-neutral-900">{system.schemaCount}</p>
                    <p className="text-xs text-neutral-500">Schemas</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-neutral-50">
                    <p className="text-lg font-semibold text-neutral-900">{system.tableCount}</p>
                    <p className="text-xs text-neutral-500">Tables</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-neutral-50">
                    <p className="text-lg font-semibold text-neutral-900">{system.dataSizeGB}</p>
                    <p className="text-xs text-neutral-500">GB</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className={`text-${sync.color}-500 ${system.syncStatus === 'syncing' ? 'animate-spin-slow' : ''}`} />
                    <span className="text-xs text-neutral-500">{system.lastSync || 'Never synced'}</span>
                  </div>
                  <Badge color={sync.color} size="sm">{sync.label}</Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {system.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">{tag}</span>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <Server size={48} className="mx-auto text-neutral-300 mb-4" />
          <p className="text-neutral-500">No systems found matching your filters.</p>
        </div>
      )}

      {/* Add System Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New System"
        subtitle="Add a system to the lifecycle management platform"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={() => setShowAddModal(false)}>Create System</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">System Name</label>
              <input type="text" placeholder="e.g. Customer Order Platform" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">System Code</label>
              <input type="text" placeholder="e.g. COP" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Description</label>
            <textarea rows={2} placeholder="Brief description of the system's purpose..." className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Owner</label>
              <input type="text" placeholder="System owner name" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Department</label>
              <input type="text" placeholder="e.g. Commerce" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-primary-50 border border-primary-100">
            <p className="text-xs text-primary-700">
              After registration, you'll be prompted to configure the system's database connection and storage bucket for Databricks sync.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SystemDetail({ system, onBack }: { system: SystemRecord; onBack: () => void }) {
  const [tab, setTab] = useState<'overview' | 'config' | 'sync'>('overview');
  const stage = stageMap[system.stage];
  const sync = syncStatusMap[system.syncStatus];

  return (
    <div className="p-6">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Systems
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
            <Server size={26} className="text-neutral-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-900">{system.name}</h1>
              <Badge color={stage.color} dot>{stage.label}</Badge>
            </div>
            <p className="text-sm text-neutral-500 mt-0.5">{system.code} · {system.department} · Owned by {system.owner}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />}>Sync Now</Button>
          <Button variant="outline" size="sm" icon={<Settings size={14} />}>Edit</Button>
          <Button variant="danger" size="sm" icon={<Archive size={14} />}>Archive</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-neutral-200">
        {(['overview', 'config', 'sync'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              tab === t ? 'text-primary-600' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t === 'overview' ? 'Overview' : t === 'config' ? 'Initialization Config' : 'Sync History'}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in">
          <Card className="p-5 lg:col-span-2">
            <h3 className="text-base font-semibold text-neutral-900 mb-4">System Information</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { label: 'System Code', value: system.code, icon: Tag },
                { label: 'Owner', value: system.owner, icon: UserIcon },
                { label: 'Department', value: system.department, icon: Building2 },
                { label: 'Created', value: system.createdAt, icon: Calendar },
                { label: 'Archived', value: system.archivedAt || '—', icon: Archive },
                { label: 'Last Sync', value: system.lastSync || 'Never', icon: RefreshCw },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label}>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                      <Icon size={12} /> {f.label}
                    </div>
                    <p className="text-sm font-medium text-neutral-800">{f.value}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-5 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-2">Description</p>
              <p className="text-sm text-neutral-700">{system.description}</p>
            </div>
            <div className="mt-5 pt-5 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {system.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-600">{tag}</span>
                ))}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="text-base font-semibold text-neutral-900 mb-4">Data Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Schemas', value: system.schemaCount, icon: Database },
                  { label: 'Tables', value: system.tableCount, icon: Database },
                  { label: 'Data Volume', value: `${system.dataSizeGB} GB`, icon: HardDrive },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                      <div className="flex items-center gap-2.5">
                        <Icon size={18} className="text-neutral-500" />
                        <span className="text-sm text-neutral-600">{s.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-neutral-900">{s.value}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-3 rounded-lg border border-neutral-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-500">Sync Status</span>
                  <Badge color={sync.color} dot>{sync.label}</Badge>
                </div>
                <p className="text-xs text-neutral-400">Last: {system.lastSync || 'Never'}</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'config' && <InitConfigTab system={system} />}
      {tab === 'sync' && <SyncHistoryTab system={system} />}
    </div>
  );
}

function InitConfigTab({ system }: { system: SystemRecord }) {
  const [dbForm, setDbForm] = useState(system.dbConfig || { engine: 'postgresql' as const, host: '', port: 5432, database: '', username: '', ssl: true });
  const [storageForm, setStorageForm] = useState(system.storageConfig || { provider: 'aws-s3' as const, bucket: '', region: '', accessKey: '' });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const hasConfig = system.dbConfig !== null;

  const handleTest = () => {
    setTestStatus('testing');
    setTimeout(() => setTestStatus('success'), 1200);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {!hasConfig && (
        <div className="p-4 rounded-xl bg-warning-50 border border-warning-200 flex items-start gap-3">
          <AlertTriangle size={20} className="text-warning-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning-800">Initialization Required</p>
            <p className="text-sm text-warning-700 mt-0.5">This system hasn't been configured yet. Fill in the database and storage details below to enable Databricks data sync.</p>
          </div>
        </div>
      )}

      {/* DB Config */}
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <Database size={18} className="text-primary-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Database Connection</h3>
            <p className="text-xs text-neutral-500">Source DB credentials for Databricks to read from</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Engine</label>
            <select
              value={dbForm.engine}
              onChange={(e) => setDbForm({ ...dbForm, engine: e.target.value as typeof dbForm.engine })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlserver">SQL Server</option>
              <option value="oracle">Oracle</option>
              <option value="mongodb">MongoDB</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Host</label>
            <input type="text" value={dbForm.host} onChange={(e) => setDbForm({ ...dbForm, host: e.target.value })} placeholder="db.internal.company.com" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Port</label>
            <input type="number" value={dbForm.port} onChange={(e) => setDbForm({ ...dbForm, port: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Database Name</label>
            <input type="text" value={dbForm.database} onChange={(e) => setDbForm({ ...dbForm, database: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Username</label>
            <input type="text" value={dbForm.username} onChange={(e) => setDbForm({ ...dbForm, username: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Password</label>
            <input type="password" placeholder="••••••••" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={dbForm.ssl} onChange={(e) => setDbForm({ ...dbForm, ssl: e.target.checked })} className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-200" />
            <span className="text-sm text-neutral-600">Use SSL/TLS connection</span>
          </label>
        </div>
      </Card>

      {/* Storage Config */}
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg bg-secondary-50 flex items-center justify-center">
            <HardDrive size={18} className="text-secondary-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Storage Bucket</h3>
            <p className="text-xs text-neutral-500">Object storage for file-level data retention</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Provider</label>
            <select
              value={storageForm.provider}
              onChange={(e) => setStorageForm({ ...storageForm, provider: e.target.value as typeof storageForm.provider })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            >
              <option value="aws-s3">AWS S3</option>
              <option value="azure-blob">Azure Blob</option>
              <option value="gcs">Google Cloud Storage</option>
              <option value="minio">MinIO</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Bucket Name</label>
            <input type="text" value={storageForm.bucket} onChange={(e) => setStorageForm({ ...storageForm, bucket: e.target.value })} placeholder="my-archive-bucket" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Region</label>
            <input type="text" value={storageForm.region} onChange={(e) => setStorageForm({ ...storageForm, region: e.target.value })} placeholder="us-east-1" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
          </div>
          {storageForm.provider === 'minio' && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Endpoint URL</label>
              <input type="text" value={storageForm.endpoint || ''} onChange={(e) => setStorageForm({ ...storageForm, endpoint: e.target.value })} placeholder="https://minio.internal" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Access Key</label>
            <input type="text" value={storageForm.accessKey} onChange={(e) => setStorageForm({ ...storageForm, accessKey: e.target.value })} placeholder="AKIA****" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Secret Key</label>
            <input type="password" placeholder="••••••••" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all" />
          </div>
        </div>
      </Card>

      {/* Test & Save */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Connection Test</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Verify both connections before saving</p>
          </div>
          <div className="flex items-center gap-3">
            {testStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-sm text-success-600 font-medium">
                <CheckCircle2 size={16} /> All connections verified
              </span>
            )}
            {testStatus === 'failed' && (
              <span className="flex items-center gap-1.5 text-sm text-error-600 font-medium">
                <AlertTriangle size={16} /> Connection failed
              </span>
            )}
            <Button variant="outline" onClick={handleTest} disabled={testStatus === 'testing'} icon={testStatus === 'testing' ? <RefreshCw size={14} className="animate-spin-slow" /> : undefined}>
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button>Save Configuration</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SyncHistoryTab({ system }: { system: SystemRecord }) {
  const jobs = [
    { id: 'j1', type: 'Incremental', status: 'success', date: '2026-08-06 02:14', duration: '4m 32s', records: '128,400' },
    { id: 'j2', type: 'Full', status: 'success', date: '2026-08-05 02:00', duration: '18m 04s', records: '482,000' },
    { id: 'j3', type: 'Incremental', status: 'success', date: '2026-08-04 02:15', duration: '3m 58s', records: '96,200' },
    { id: 'j4', type: 'Schema Only', status: 'success', date: '2026-08-03 12:00', duration: '1m 12s', records: '—' },
    { id: 'j5', type: 'Incremental', status: 'failed', date: '2026-08-02 02:10', duration: '0m 45s', records: '0' },
  ];

  return (
    <div className="animate-fade-in">
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Job ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Type</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Started</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Duration</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Records</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {jobs.map((job) => {
              const s = syncStatusMap[job.status as SyncStatus];
              return (
                <tr key={job.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-3 text-sm font-mono text-neutral-600">{job.id}</td>
                  <td className="px-5 py-3 text-sm text-neutral-700">{job.type}</td>
                  <td className="px-5 py-3"><Badge color={s.color} size="sm">{s.label}</Badge></td>
                  <td className="px-5 py-3 text-sm text-neutral-500">{job.date}</td>
                  <td className="px-5 py-3 text-sm text-neutral-500">{job.duration}</td>
                  <td className="px-5 py-3 text-sm text-neutral-700 text-right">{job.records}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}