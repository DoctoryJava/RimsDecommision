import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  ChevronRight,
  ChevronDown,
  Table2,
  HardDrive,
  Download,
  Settings,
  Zap,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import type { SyncStatus, SyncJob, SchemaRecord, SystemRecord } from '@/types';
import { getSystems, getSyncJobs, getSchemas } from '@/lib/api';

const syncStatusMap: Record<SyncStatus, { color: 'success' | 'warning' | 'error' | 'primary' | 'neutral'; label: string }> = {
  success: { color: 'success', label: 'Success' },
  syncing: { color: 'primary', label: 'Syncing' },
  failed: { color: 'error', label: 'Failed' },
  partial: { color: 'warning', label: 'Partial' },
  idle: { color: 'neutral', label: 'Idle' },
};

// TODO Phase 1-5: replace mockData with api calls in useEffect (fallback to mock if API unreachable)
export default function DataSyncPage() {
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [expandedSchema, setExpandedSchema] = useState<string | null>(null);
  const [jobsData, setJobsData] = useState<SyncJob[]>([]);
  const [schemasData, setSchemasData] = useState<SchemaRecord[]>([]);
  const [systemsData, setSystemsData] = useState<SystemRecord[]>([]);

  // 数据全部来自后端
  useEffect(() => {
    getSyncJobs({ pageNum: 1, pageSize: 100 }).then((p: any) => { if(p?.list) setJobsData(p.list as SyncJob[]); }).catch(()=>{});
    getSchemas().then((list: any) => { if(Array.isArray(list) && list.length) { setSchemasData(list as unknown as SchemaRecord[]); setExpandedSchema((list[0] as any).id); } }).catch(()=>{});
    getSystems({ pageNum: 1, pageSize: 100 }).then((p: any) => { if(p?.list) setSystemsData(p.list as SystemRecord[]); }).catch(()=>{});
  }, []);

  return (
    <div className="p-6">
      {/* API Integration: this page now has backend /api/* ready, frontend will call via src/lib/api.ts with fallback to mockData */}
      <PageHeader
        title="Data Sync"
        subtitle="Trigger and monitor Databricks data synchronization jobs across systems"
        actions={
          <Button icon={<Play size={16} />} onClick={() => setShowSyncModal(true)}>Trigger Sync</Button>
        }
      />

      {/* Databricks status banner */}
      <Card className="p-4 mb-5 bg-gradient-to-r from-neutral-950 to-neutral-900 border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Databricks Engine</p>
              <p className="text-xs text-neutral-400">Cluster: retention-cluster-prod · Runtime 15.4 LTS · Running</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-neutral-500">Jobs Today</p>
              <p className="text-lg font-semibold text-white">12</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500">Avg Duration</p>
              <p className="text-lg font-semibold text-white">8m 24s</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500">Success Rate</p>
              <p className="text-lg font-semibold text-secondary-400">83%</p>
            </div>
            <Button variant="outline" size="sm" icon={<Settings size={14} />} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">Configure</Button>
          </div>
        </div>
      </Card>

      {/* Sync jobs table */}
      <Card className="overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900">Sync Jobs</h3>
          <Badge color="neutral" size="sm">{jobsData.length} total</Badge>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Job ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">System</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Type</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Started</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Duration</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Records</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Trigger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {jobsData.map((job) => {
              const s = syncStatusMap[job.status];
              const Icon = job.status === 'success' ? CheckCircle2 : job.status === 'failed' ? AlertTriangle : job.status === 'syncing' ? RefreshCw : Clock;
              return (
                <tr key={job.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-3 text-sm font-mono text-neutral-600">{job.id}</td>
                  <td className="px-5 py-3 text-sm font-medium text-neutral-800">{job.systemName}</td>
                  <td className="px-5 py-3 text-sm text-neutral-600 capitalize">{job.type}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Icon size={15} className={`text-${s.color}-500 ${job.status === 'syncing' ? 'animate-spin-slow' : ''}`} />
                      <Badge color={s.color} size="sm">{s.label}</Badge>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-neutral-500">{job.startedAt}</td>
                  <td className="px-5 py-3 text-sm text-neutral-500">{job.duration}</td>
                  <td className="px-5 py-3 text-sm text-neutral-700 text-right">{job.records > 0 ? job.records.toLocaleString() : '—'}</td>
                  <td className="px-5 py-3 text-sm text-neutral-500">{job.triggeredBy}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Schema browser */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="text-base font-semibold text-neutral-900">Schema Browser</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Browse synced schemas and tables across systems</p>
        </div>
        <div className="divide-y divide-neutral-100">
          {schemasData.map((schema) => {
            const isExpanded = expandedSchema === schema.id;
            const system = systemsData.find((s) => s.id === schema.systemId);
            return (
              <div key={schema.id}>
                <button
                  onClick={() => setExpandedSchema(isExpanded ? null : schema.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={16} className="text-neutral-400" /> : <ChevronRight size={16} className="text-neutral-400" />}
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                      <Database size={16} className="text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 font-mono">{schema.name}</p>
                      <p className="text-xs text-neutral-500">{system?.name} · {schema.tables.length} tables · synced {schema.syncedAt}</p>
                    </div>
                  </div>
                  <Badge color="neutral" size="sm">{schema.tables.length} tables</Badge>
                </button>
                {isExpanded && (
                  <div className="pl-16 pr-5 pb-3 animate-fade-in">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-neutral-500 border-b border-neutral-100">
                          <th className="text-left py-2 font-medium">Table</th>
                          <th className="text-right py-2 font-medium">Columns</th>
                          <th className="text-right py-2 font-medium">Rows</th>
                          <th className="text-right py-2 font-medium">Size</th>
                          <th className="text-center py-2 font-medium">Status</th>
                          <th className="text-right py-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {schema.tables.map((table) => (
                          <tr key={table.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <Table2 size={14} className="text-neutral-400" />
                                <span className="text-sm font-mono text-neutral-700">{table.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-sm text-neutral-500 text-right">{table.columns}</td>
                            <td className="py-2.5 text-sm text-neutral-500 text-right">{table.rows.toLocaleString()}</td>
                            <td className="py-2.5 text-sm text-neutral-500 text-right">{table.sizeMB} MB</td>
                            <td className="py-2.5 text-center">
                              {table.archived ? <Badge color="success" size="sm" dot>Archived</Badge> : <Badge color="neutral" size="sm">Pending</Badge>}
                            </td>
                            <td className="py-2.5 text-right">
                              <button className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                                <Download size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Trigger Sync Modal */}
      <Modal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="Trigger Data Sync"
        subtitle="Start a new Databricks synchronization job"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSyncModal(false)}>Cancel</Button>
            <Button icon={<Play size={16} />}>Start Sync</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Select System</label>
            <select className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all">
              {systemsData.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Sync Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['full', 'incremental', 'schema-only'] as const).map((type) => (
                <label key={type} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer transition-all has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50">
                  <input type="radio" name="syncType" defaultChecked={type === 'incremental'} className="sr-only" />
                  {type === 'full' ? <HardDrive size={18} className="text-neutral-500" /> : type === 'incremental' ? <RefreshCw size={18} className="text-neutral-500" /> : <Database size={18} className="text-neutral-500" />}
                  <span className="text-xs font-medium text-neutral-700 capitalize">{type.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-primary-50 border border-primary-100">
            <p className="text-xs text-primary-700">
              The sync job will run on the Databricks retention cluster and may take several minutes depending on data volume.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}