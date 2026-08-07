import { useState, useEffect } from 'react';
import {
  Server,
  Archive,
  HardDrive,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Activity,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PageHeader from '@/components/ui/PageHeader';
import type { PageKey } from '@/components/layout/Sidebar';
import { getSystemStats, getStorageUsage, getSyncActivity, getSyncJobs, getSystems } from '@/lib/api';
import type { SyncStatus } from '@/types';

interface DashboardPageProps {
  onNavigate: (page: PageKey) => void;
}

const syncStatusMap: Record<SyncStatus, { color: 'success' | 'warning' | 'error' | 'primary' | 'neutral'; label: string }> = {
  success: { color: 'success', label: 'Success' },
  syncing: { color: 'primary', label: 'Syncing' },
  failed: { color: 'error', label: 'Failed' },
  partial: { color: 'warning', label: 'Partial' },
  idle: { color: 'neutral', label: 'Idle' },
};

const storageColor = ['primary', 'secondary', 'accent', 'warning', 'neutral'] as const;

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [apiStats, setApiStats] = useState<any>(null);
  const [systemsData, setSystemsData] = useState<any[]>([]);
  const [jobsData, setJobsData] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [storageData, setStorageData] = useState<any[]>([]);

  useEffect(() => {
    getSystemStats().then(setApiStats).catch(()=>{});
    getSystems({ pageNum: 1, pageSize: 100 }).then((p: any) => setSystemsData((p?.list ?? []) as any[])).catch(()=>{});
    getSyncJobs({ pageNum: 1, pageSize: 100 }).then((p: any) => setJobsData((p?.list ?? []) as any[])).catch(()=>{});
    getSyncActivity().then(setActivityData).catch(()=>{});
    getStorageUsage().then((list: any) => setStorageData(list as any[])).catch(()=>{});
  }, []);

  const total = apiStats?.total ?? systemsData.length;
  const activeCount = apiStats?.active ?? systemsData.filter((s) => s.stage === 'active').length;
  const deprecatedCount = apiStats?.deprecated ?? systemsData.filter((s) => s.stage === 'deprecated').length;
  const archivedCount = apiStats?.archived ?? systemsData.filter((s) => s.stage === 'archived').length;
  const totalDataGB = apiStats?.totalDataGB ?? systemsData.reduce((sum, s) => sum + (s.dataSizeGB || 0), 0);
  const destroyedCount = systemsData.filter((s) => s.stage === 'destroyed').length;

  const recentJobs = jobsData.slice(0, 5);
  const maxStorage = Math.max(1, ...storageData.map((d) => d.gb || 0));

  const stats = [
    { label: 'Total Systems', value: total, icon: Server, color: 'primary', sub: `${activeCount} active` },
    { label: 'Archived', value: archivedCount, icon: Archive, color: 'secondary', sub: 'Data retained' },
    { label: 'Data Volume', value: `${(totalDataGB / 1024).toFixed(1)} TB`, icon: HardDrive, color: 'accent', sub: 'Across all systems' },
    { label: 'Syncs (7d)', value: activityData.reduce((sum, d) => sum + (d.success || 0) + (d.failed || 0) + (d.partial || 0), 0), icon: RefreshCw, color: 'warning', sub: `${activityData.reduce((sum, d) => sum + (d.failed || 0), 0)} failed` },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your system lifecycle, data retention, and sync activity"
        actions={
          <button
            onClick={() => onNavigate('systems')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            View All Systems
            <ArrowRight size={16} />
          </button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const colorClasses: Record<string, string> = {
            primary: 'bg-primary-50 text-primary-600',
            secondary: 'bg-secondary-50 text-secondary-600',
            accent: 'bg-accent-50 text-accent-600',
            warning: 'bg-warning-50 text-warning-600',
          };
          return (
            <Card key={stat.label} hover className="p-5 animate-fade-in-up" >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500">{stat.label}</p>
                  <p className="text-2xl font-semibold text-neutral-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-neutral-400 mt-1">{stat.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[stat.color]}`}>
                  <Icon size={20} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Lifecycle distribution + Storage usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Sync Activity</h3>
              <p className="text-sm text-neutral-500">Last 7 days</p>
            </div>
            <Badge color="primary" dot>Live</Badge>
          </div>
          <div className="flex items-end justify-between gap-3 h-48 pt-4">
            {(activityData.length ? activityData : Array.from({length:7},(_,i)=>({day:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],success:0,failed:0,partial:0}))).map((d) => {
              const maxBar = 7;
              const successH = ((d.success || 0) / maxBar) * 100;
              const failedH = ((d.failed || 0) / maxBar) * 100;
              const partialH = ((d.partial || 0) / maxBar) * 100;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col-reverse items-center gap-0.5 h-full justify-end">
                    <div className="w-full max-w-[32px] bg-success-500 rounded-t-md transition-all duration-500" style={{ height: `${successH}%` }} />
                    {partialH > 0 && <div className="w-full max-w-[32px] bg-warning-500 transition-all duration-500" style={{ height: `${partialH}%` }} />}
                    {failedH > 0 && <div className="w-full max-w-[32px] bg-error-500 transition-all duration-500" style={{ height: `${failedH}%` }} />}
                  </div>
                  <span className="text-xs text-neutral-500 font-medium">{d.day}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-100">
            <span className="flex items-center gap-1.5 text-xs text-neutral-600"><span className="w-2.5 h-2.5 rounded bg-success-500" /> Success</span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-600"><span className="w-2.5 h-2.5 rounded bg-warning-500" /> Partial</span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-600"><span className="w-2.5 h-2.5 rounded bg-error-500" /> Failed</span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-semibold text-neutral-900 mb-1">Storage Usage</h3>
          <p className="text-sm text-neutral-500 mb-4">By system (GB)</p>
          <div className="space-y-3">
            {storageData.map((d, i) => {
              const pct = ((d.gb || 0) / maxStorage) * 100;
              const colorClasses: Record<string, string> = {
                primary: 'bg-primary-500',
                secondary: 'bg-secondary-500',
                accent: 'bg-accent-500',
                warning: 'bg-warning-500',
                neutral: 'bg-neutral-400',
              };
              const color = storageColor[i % storageColor.length];
              return (
                <div key={d.system || d.name || i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-neutral-700">{d.system || d.name}</span>
                    <span className="text-xs text-neutral-500">{d.gb} GB</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${colorClasses[color]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {storageData.length === 0 && <p className="text-sm text-neutral-400">暂无存储数据</p>}
          </div>
        </Card>
      </div>

      {/* Lifecycle pipeline + Recent sync jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="text-base font-semibold text-neutral-900 mb-4">Lifecycle Pipeline</h3>
          <div className="space-y-1">
            {[
              { stage: 'Active', count: activeCount, color: 'success', icon: Activity },
              { stage: 'Deprecated', count: deprecatedCount, color: 'warning', icon: AlertTriangle },
              { stage: 'Archived', count: archivedCount, color: 'neutral', icon: Archive },
              { stage: 'Destroyed', count: destroyedCount, color: 'error', icon: Server },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.stage} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-${s.color}-50 text-${s.color}-600`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-sm font-medium text-neutral-700">{s.stage}</span>
                  </div>
                  <span className="text-lg font-semibold text-neutral-900">{s.count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-neutral-900">Recent Sync Jobs</h3>
            <button onClick={() => onNavigate('data-sync')} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {recentJobs.map((job) => {
              const status = syncStatusMap[job.status as SyncStatus] || syncStatusMap.idle;
              const Icon = job.status === 'success' ? CheckCircle2 : job.status === 'failed' ? AlertTriangle : job.status === 'syncing' ? RefreshCw : Clock;
              return (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors border border-neutral-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={18} className={`text-${status.color}-500 shrink-0 ${job.status === 'syncing' ? 'animate-spin-slow' : ''}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">{job.systemName}</p>
                      <p className="text-xs text-neutral-500">{job.type} sync · {job.startedAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {job.records > 0 && <span className="text-xs text-neutral-500">{Number(job.records).toLocaleString()} rows</span>}
                    <Badge color={status.color} size="sm">{status.label}</Badge>
                  </div>
                </div>
              );
            })}
            {recentJobs.length === 0 && <p className="text-sm text-neutral-400">暂无同步任务</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
