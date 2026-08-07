import { useState, useEffect, useCallback } from 'react';
import { Archive, FolderOpen, FileText, Files, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { getArchiveBatches, getArchiveFiles, getArchiveSets, getArchiveSetItems } from '@/lib/api';

const resultColor: Record<string, 'success' | 'error' | 'warning' | 'primary' | 'neutral'> = {
  SUCCESS: 'success',
  FAILED: 'error',
  PARTIAL: 'warning',
  RUNNING: 'primary',
};

export default function ArchivePage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selSet, setSelSet] = useState<string | null>(null);
  const [tab, setTab] = useState<'batches' | 'files' | 'sets'>('batches');

  const loadBatches = useCallback(() => {
    getArchiveBatches({ pageNum: 1, pageSize: 100 }).then((p: any) => setBatches((p?.list ?? []) as any[])).catch(() => setBatches([]));
  }, []);
  const loadFiles = useCallback(() => {
    getArchiveFiles().then(setFiles).catch(() => setFiles([]));
  }, []);
  const loadSets = useCallback(() => {
    getArchiveSets().then(setSets).catch(() => setSets([]));
  }, []);

  useEffect(() => { loadBatches(); loadFiles(); loadSets(); }, [loadBatches, loadFiles, loadSets]);

  const openSet = (id: string) => {
    setSelSet(id);
    getArchiveSetItems(id).then(setItems).catch(() => setItems([]));
  };

  return (
    <div className="p-6">
      <PageHeader
        title="归档产物"
        subtitle="查看归档批次、结构化表归档文件与非结构化文件集归档结果"
        actions={
          <Button variant="outline" icon={<RefreshCw size={16} />} onClick={() => { loadBatches(); loadFiles(); loadSets(); }}>刷新</Button>
        }
      />

      {/* Tab switch */}
      <div className="flex items-center gap-2 mb-5">
        {([
          ['batches', '归档批次', Archive],
          ['files', '归档文件', FileText],
          ['sets', '归档集', FolderOpen],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'batches' && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
            <Archive size={16} className="text-primary-500" />
            <h3 className="text-base font-semibold text-neutral-900">归档批次</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">批次ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">任务ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">年份</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">开始</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">行数</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">字节</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">结果</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-50/50">
                  <td className="px-5 py-3 text-sm font-mono text-neutral-700">{b.id}</td>
                  <td className="px-5 py-3 text-sm font-mono text-neutral-500">{b.archiveJobId}</td>
                  <td className="px-5 py-3 text-sm text-neutral-600">{b.batchYear ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-neutral-500">{b.startedAt ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-neutral-700 text-right">{b.rowsOut?.toLocaleString?.() ?? b.rowsOut}</td>
                  <td className="px-5 py-3 text-sm text-neutral-500 text-right">{b.bytesOut ? (b.bytesOut / 1024 / 1024).toFixed(1) + ' MB' : '—'}</td>
                  <td className="px-5 py-3"><Badge color={resultColor[b.result] || 'neutral'} size="sm">{b.result}</Badge></td>
                </tr>
              ))}
              {batches.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-neutral-400">暂无归档批次</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'files' && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
            <FileText size={16} className="text-primary-500" />
            <h3 className="text-base font-semibold text-neutral-900">归档文件（结构化表）</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">表名</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">批次</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Blob 地址</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">大小</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">创建时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {files.map((f) => (
                <tr key={f.id} className="hover:bg-neutral-50/50">
                  <td className="px-5 py-3 text-sm font-mono text-neutral-700">{f.schemaName ? f.schemaName + '.' : ''}{f.tableName}</td>
                  <td className="px-5 py-3 text-sm font-mono text-neutral-500">{f.archiveBatchId}</td>
                  <td className="px-5 py-3 text-sm text-primary-600 truncate max-w-[280px]">{f.blobUrl}</td>
                  <td className="px-5 py-3 text-sm text-neutral-500 text-right">{f.sizeBytes ? (f.sizeBytes / 1024 / 1024).toFixed(1) + ' MB' : '—'}</td>
                  <td className="px-5 py-3 text-sm text-neutral-500">{f.createdOn ?? '—'}</td>
                </tr>
              ))}
              {files.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">暂无归档文件</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'sets' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
              <FolderOpen size={16} className="text-primary-500" />
              <h3 className="text-base font-semibold text-neutral-900">归档集（非结构化）</h3>
            </div>
            <div className="divide-y divide-neutral-100">
              {sets.map((s) => (
                <button key={s.id} onClick={() => openSet(s.id)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 text-left">
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{s.setName}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">批次 {s.archiveBatchId} · {s.itemsCount} 项 · {s.bytesTotal ? (s.bytesTotal / 1024 / 1024).toFixed(1) + ' MB' : '—'}</p>
                  </div>
                  <Badge color={selSet === s.id ? 'primary' : 'neutral'} size="sm">{selSet === s.id ? '查看中' : '查看条目'}</Badge>
                </button>
              ))}
              {sets.length === 0 && <div className="px-5 py-10 text-center text-sm text-neutral-400">暂无归档集</div>}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
              <Files size={16} className="text-primary-500" />
              <h3 className="text-base font-semibold text-neutral-900">归档集条目</h3>
            </div>
            {selSet ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">文件名</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">大小</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">类型</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-neutral-50/50">
                      <td className="px-5 py-3 text-sm font-mono text-neutral-700">{it.originalName}</td>
                      <td className="px-5 py-3 text-sm text-neutral-500 text-right">{it.sizeBytes ? (it.sizeBytes / 1024).toFixed(1) + ' KB' : '—'}</td>
                      <td className="px-5 py-3 text-xs text-neutral-500">{it.contentType}</td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-neutral-400">选择左侧归档集查看条目</td></tr>}
                </tbody>
              </table>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-neutral-400">选择一个归档集查看其条目</div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
