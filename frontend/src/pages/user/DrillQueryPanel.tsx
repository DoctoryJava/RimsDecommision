import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  ChevronDown, ChevronRight, Database, Layers, Search, Loader2, X,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { getDrillConfigs, sparkExecuteQuery } from '@/lib/api';

// ===== 类型 =====
export interface DrillNode {
  id: string;
  name: string;
  baseTable: string;
  parentField: string;
  childField: string;
  fields?: any[];
  children?: DrillNode[];
}

interface Props {
  systemId: string;
  database: string;
  configId: string;
  mainTable: string;   // db.table
  mainFields: any[];   // 主表要显示的字段
}

// 读取某表的字段列表（从已同步表结构生成列名，这里用查询结果第一行推断）
function keysOf(row: Record<string, any> | undefined): string[] {
  return row ? Object.keys(row) : [];
}

export default function DrillQueryPanel({ systemId, database, configId, mainTable, mainFields }: Props) {
  const [mainRows, setMainRows] = useState<Record<string, any>[]>([]);
  const [mainCols, setMainCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drillTree, setDrillTree] = useState<DrillNode[]>([]);
  // 展开状态：主表行 order_id -> true；子级用 key
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const mainTableName = mainTable.split('.').pop() || mainTable;

  const loadMain = useCallback(() => {
    if (!mainTable) return;
    setLoading(true); setError('');
    const sel = mainFields.length
      ? mainFields.map((f: any) => `${f.alias || f.column}`).join(', ')
      : '*';
    const sql = `SELECT ${sel} FROM ${database}.archive.${mainTableName} LIMIT 500`;
    sparkExecuteQuery({ systemId, database, sql, page: 1, pageSize: 500 })
      .then((res: any) => {
        setMainRows(res?.rows ?? []);
        const cols = res?.columns ?? [];
        setMainCols(mainFields.length ? mainFields.map((f: any) => f.alias || f.column) : cols);
      })
      .catch((e: any) => setError(e?.message || '查询失败'))
      .finally(() => setLoading(false));
  }, [systemId, database, mainTable, mainTableName, mainFields]);

  useEffect(() => { loadMain(); }, [loadMain]);

  useEffect(() => {
    if (!configId) return;
    getDrillConfigs(configId).then((list: any) => setDrillTree((list ?? []) as DrillNode[])).catch(() => setDrillTree([]));
  }, [configId]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // 递归渲染一个下钻节点
  const renderDrillNode = (node: DrillNode, parentRow: Record<string, any>, depth: number) => {
    const parentVal = parentRow[node.parentField];
    const key = `${depth}-${node.id}-${String(parentVal)}`;
    const isOpen = expanded.has(key);
    return (
      <div key={node.id} className={depth > 0 ? 'ml-6 border-l-2 border-primary-100 pl-3 mt-2' : 'mt-2'}>
        <button
          onClick={() => toggle(key)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-md border border-neutral-200 hover:bg-neutral-100 transition-colors"
        >
          {isOpen ? <ChevronDown size={14} className="text-primary-500" /> : <ChevronRight size={14} className="text-primary-500" />}
          <Layers size={14} className="text-primary-500" />
          <span className="text-sm font-medium text-neutral-800">{node.name}</span>
          <span className="text-xs text-neutral-400 ml-2">{node.baseTable}（{node.parentField} = {String(parentVal)}）</span>
        </button>
        {isOpen && (
          <ChildTable
            systemId={systemId}
            database={database}
            node={node}
            parentVal={parentVal}
            onDrill={renderDrillNode}
            renderDepth={depth + 1}
          />
        )}
      </div>
    );
  };

  return (
    <div>
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-primary-500" />
            <h3 className="text-base font-semibold text-neutral-900">关联明细（行内展开）</h3>
          </div>
          <Badge color="neutral" size="sm">{mainRows.length}</Badge>
        </div>
        {error && <div className="p-3 bg-error-50 border-b border-error-200 text-sm text-error-600">{error}</div>}
        {loading ? (
          <div className="p-10 text-center text-sm text-neutral-400 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> 加载中…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider w-8"></th>
                  {mainCols.map((c) => <th key={c} className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">{c}</th>)}
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">明细</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mainRows.length === 0 ? (
                  <tr><td colSpan={mainCols.length + 2} className="text-center py-10 text-sm text-neutral-400">暂无数据</td></tr>
                ) : (
                  mainRows.map((row, i) => {
                    const rowKey = String(i);
                    const isOpen = expanded.has(rowKey);
                    return (
                      <Fragment key={rowKey}>
                        <tr className="hover:bg-neutral-50/50">
                          <td className="px-4 py-3">
                            <button onClick={() => toggle(rowKey)} className="text-neutral-400 hover:text-primary-500">
                              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </td>
                          {mainCols.map((c) => (
                            <td key={c} className="px-4 py-3 text-sm text-neutral-700 whitespace-nowrap">{row[c] === undefined || row[c] === null ? '—' : String(row[c])}</td>
                          ))}
                          <td className="px-4 py-3 text-right">
                            {drillTree.length > 0 && (
                              <Button size="sm" variant="outline" icon={<Layers size={13} />} onClick={() => toggle(rowKey)}>
                                查看明细
                              </Button>
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={mainCols.length + 2} className="px-4 py-3 bg-neutral-50/40">
                              {drillTree.length === 0 ? (
                                <p className="text-sm text-neutral-400 text-center py-4">该查询未配置下钻明细</p>
                              ) : (
                                <div className="space-y-1">
                                  {drillTree.map((node) => renderDrillNode(node, row, 0))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// 子表组件：按 parentField=parentVal 过滤查询，展示 + 继续下钻
function ChildTable({
  systemId, database, node, parentVal, onDrill, renderDepth,
}: {
  systemId: string;
  database: string;
  node: DrillNode;
  parentVal: any;
  onDrill: (n: DrillNode, parentRow: Record<string, any>, depth: number) => React.ReactNode;
  renderDepth: number;
}) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tableName = node.baseTable.split('.').pop() || node.baseTable;

  useEffect(() => {
    setLoading(true); setError('');
    const sel = node.fields?.length ? node.fields.map((f: any) => f.alias || f.column).join(', ') : '*';
    const sql = `SELECT ${sel} FROM ${database}.archive.${tableName} WHERE ${node.childField} = '${parentVal}' LIMIT 200`;
    sparkExecuteQuery({ systemId, database, sql, page: 1, pageSize: 200 })
      .then((res: any) => {
        setRows(res?.rows ?? []);
        const c = res?.columns ?? [];
        setCols(node.fields?.length ? node.fields.map((f: any) => f.alias || f.column) : c);
      })
      .catch((e: any) => setError(e?.message || '查询失败'))
      .finally(() => setLoading(false));
  }, [systemId, database, node, parentVal]);

  const toggle = (key: string) => {
    setExpanded((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  return (
    <div className="bg-white rounded-md border border-neutral-200 mt-1">
      {loading ? (
        <div className="p-4 text-xs text-neutral-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> 加载…</div>
      ) : error ? (
        <div className="p-4 text-xs text-error-600">{error}</div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500">
              <th className="px-3 py-2 w-7"></th>
              {cols.map((c) => <th key={c} className="text-left px-3 py-2 font-medium whitespace-nowrap">{c}</th>)}
              {node.children?.length ? <th className="px-3 py-2 text-right font-medium">操作</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 ? (
              <tr><td colSpan={cols.length + 2} className="text-center py-4 text-neutral-400">无关联数据</td></tr>
            ) : (
              rows.map((r, i) => {
                const rk = String(i);
                const open = expanded.has(rk);
                return (
                  <Fragment key={rk}>
                    <tr className="hover:bg-neutral-50/50">
                      <td className="px-3 py-2">
                        {node.children?.length ? (
                          <button onClick={() => toggle(rk)} className="text-neutral-400 hover:text-primary-500">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
                        ) : null}
                      </td>
                      {cols.map((c) => <td key={c} className="px-3 py-2 text-neutral-700 whitespace-nowrap">{r[c] === undefined || r[c] === null ? '—' : String(r[c])}</td>)}
                      {node.children?.length ? (
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="ghost" icon={<Layers size={12} />} onClick={() => toggle(rk)}>明细</Button>
                        </td>
                      ) : null}
                    </tr>
                    {open && node.children?.map((sub) => onDrill(sub, r, renderDepth))}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
