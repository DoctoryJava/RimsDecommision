import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  ChevronDown, ChevronRight, Database, Layers, Search, Loader2, X, Filter, Plus, Download,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { getDrillConfigs, sparkExecuteQuery } from '@/lib/api';
import { maskValue } from '@/lib/mask';

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
  mainJoins?: any[];   // 表关联（查询配置里的 joins）
}

// 读取某表的字段列表（从已同步表结构生成列名，这里用查询结果第一行推断）
function keysOf(row: Record<string, any> | undefined): string[] {
  return row ? Object.keys(row) : [];
}

// 筛选条件：field = 配置字段的 alias（或 column），operator 精简集
type FilterOperator = 'eq' | 'like' | 'gt' | 'lt' | 'is_null';
interface FilterCond {
  field: string;
  operator: FilterOperator;
  value: string;
}

export default function DrillQueryPanel({ systemId, database, configId, mainTable, mainFields, mainJoins = [] }: Props) {
  const [mainRows, setMainRows] = useState<Record<string, any>[]>([]);
  const [mainCols, setMainCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drillTree, setDrillTree] = useState<DrillNode[]>([]);
  // 展开状态：主表行 order_id -> true；子级用 key
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // 筛选：编辑态 + 已应用态
  const [draftFilters, setDraftFilters] = useState<FilterCond[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<FilterCond[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  // 正在下载的行（rowKey）
  const [downloadingRow, setDownloadingRow] = useState<string | null>(null);

  // 标记为脱敏的字段列名（alias 或 column）
  const maskedCols = new Set(
    (mainFields || []).filter((f: any) => f.masked).map((f: any) => f.alias || f.column),
  );

  // 配置中标记为可筛选的字段
  const filterableFields = (mainFields || []).filter((f: any) => f.filterable);
  // 标记为可筛选字段的候选下拉：alias(column)
  const filterableOptions = filterableFields.map((f: any) => ({
    label: f.alias || f.column,
    value: f.alias || f.column,
  }));

  const addFilterRow = () => {
    const first = filterableFields[0];
    if (!first) return;
    setDraftFilters(prev => [...prev, { field: first.alias || first.column, operator: 'eq', value: '' }]);
  };
  const updateFilterRow = (i: number, patch: Partial<FilterCond>) => {
    setDraftFilters(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  };
  const removeFilterRow = (i: number) => {
    setDraftFilters(prev => prev.filter((_, idx) => idx !== i));
  };
  const applyFilters = () => {
    // 去掉无效行：is_null 无需值，其余需填值
    const valid = draftFilters.filter(c => c.operator === 'is_null' || (c.value && c.value.trim() !== ''));
    setAppliedFilters(valid);
  };
  const clearFilters = () => {
    setDraftFilters([]);
    setAppliedFilters([]);
  };

  // CSV 单元格转义 + 生成文件下载
  const csvCell = (v: any): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  // 递归查询某行对应的所有下钻明细（多级）
  const collectDrillRows = async (nodes: DrillNode[], parentRow: Record<string, any>): Promise<{ name: string; columns: string[]; rows: Record<string, any>[] }[]> => {
    const out: { name: string; columns: string[]; rows: Record<string, any>[] }[] = [];
    for (const node of nodes) {
      const parentVal = parentRow[node.parentField];
      if (parentVal === undefined || parentVal === null) continue;
      const nodeParts = (node.baseTable || '').split('.');
      const tblName = nodeParts.pop() || node.baseTable;
      const d = database || (nodeParts.length ? nodeParts[0] : '') || 'mi';
      const sel = node.fields?.length ? node.fields.map((f: any) => f.alias || f.column).join(', ') : '*';
      const sql = `SELECT ${sel} FROM ${d}.archive.${tblName} WHERE ${node.childField} = '${parentVal}' LIMIT 200`;
      try {
        const res = await sparkExecuteQuery({ systemId, database, sql, page: 1, pageSize: 200, purpose: 'download' });
        const cols = node.fields?.length ? node.fields.map((f: any) => f.alias || f.column) : (res?.columns ?? []);
        const rows = res?.rows ?? [];
        out.push({ name: node.name, columns: cols, rows });
        // 递归子级明细
        if (node.children?.length) {
          for (const childRow of rows) {
            const sub = await collectDrillRows(node.children, childRow);
            out.push(...sub);
          }
        }
      } catch {
        // 子表查询失败不影响主数据
      }
    }
    return out;
  };

  // 下载某一行：主表 + 关联的一对多明细
  const downloadRow = async (row: Record<string, any>, rowKey: string) => {
    if (downloadingRow) return;
    setDownloadingRow(rowKey);
    try {
      const mainColsArr = mainCols.length ? mainCols : Object.keys(row);
      // 收集所有明细表
      const drillSets = await collectDrillRows(drillTree, row);

      // 合并所有列（主表列 + 各明细表列），去重保序
      const allCols: string[] = [];
      const addCol = (c: string) => { if (c && !allCols.includes(c)) allCols.push(c); };
      ['表', ...mainColsArr].forEach(addCol);
      drillSets.forEach((s) => s.columns.forEach(addCol));

      // 组装行：主表 1 行 + 每个明细若干行
      const lines: Record<string, any>[] = [];
      const mainRow: Record<string, any> = { '表': mainTableName };
      mainColsArr.forEach((c) => { mainRow[c] = row[c]; });
      lines.push(mainRow);
      for (const ds of drillSets) {
        for (const r of ds.rows) {
          const line: Record<string, any> = { '表': ds.name };
          ds.columns.forEach((c) => { line[c] = r[c]; });
          lines.push(line);
        }
      }

      // 生成 CSV
      const header = allCols.map(csvCell).join(',');
      const body = lines.map((l) => allCols.map((c) => csvCell(l[c])).join(','));
      const content = '\uFEFF' + [header, ...body].join('\r\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const pk = mainColsArr[0] !== undefined ? row[mainColsArr[0]] : rowKey;
      a.download = `${mainTableName}_${String(pk ?? rowKey)}_明细.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      window.alert('下载失败：' + (e?.message || '请稍后重试'));
    } finally {
      setDownloadingRow(null);
    }
  };

  const mainTableParts = (mainTable || '').split('.');
  const mainTableName = mainTableParts.pop() || mainTable;
  // 库名兜底：优先外部传入，其次从 <库>.<表> 中解析，最后默认 mi
  const db = database || (mainTableParts.length ? mainTableParts[0] : '') || 'mi';

  // 把 <库>.<表> 转成 Iceberg 物理表名 <库>.archive.<表>
  const phys = (ref: string) => {
    const p = (ref || '').split('.');
    const t = p.pop() || ref;
    const d = p.length ? p[0] : db;
    return `${d}.archive.${t}`;
  };

  const loadMain = useCallback(() => {
    if (!mainTable) return;
    setLoading(true); setError('');

    // 表别名：主表 t0，关联表 t1、t2…
    const aliasMap = new Map<string, string>();
    aliasMap.set(mainTable, 't0');
    let aliasIdx = 1;
    const joinClauses = (mainJoins || []).map((j: any) => {
      const rightRef = j.rightTable;
      if (!rightRef) return null;
      const leftRef = j.leftTable || mainTable;
      if (!aliasMap.has(rightRef)) aliasMap.set(rightRef, 't' + aliasIdx++);
      const la = aliasMap.get(leftRef) || 't0';
      const ra = aliasMap.get(rightRef) as string;
      const jt = (j.joinType || 'left').toUpperCase();
      return `${jt} JOIN ${phys(rightRef)} ${ra} ON ${la}.${j.leftColumn} = ${ra}.${j.rightColumn}`;
    }).filter(Boolean) as string[];

    let select = '*';
    if (mainFields.length) {
      const parts = mainFields.map((f: any) => {
        const col = f.column || f.alias || '';
        if (!col) return '';
        const tblRef = f.table || mainTable;
        const a = aliasMap.get(tblRef) || 't0';
        const out = f.alias || col;
        return `${a}.${col} AS ${out}`;
      }).filter(Boolean);
      select = parts.length ? parts.join(', ') : '*';
    }

    const from = `FROM ${phys(mainTable)} t0${joinClauses.length ? ' ' + joinClauses.join(' ') : ''}`;

    // 根据已应用的筛选条件生成 WHERE（字段按所属表加别名限定）
    let where = '';
    if (appliedFilters.length) {
      const conds = appliedFilters.map((c) => {
        const f = mainFields.find((x: any) => (x.alias || x.column) === c.field);
        if (!f || !f.column) return null;
        const tblRef = f.table || mainTable;
        const a = aliasMap.get(tblRef) || 't0';
        const colRef = `${a}.${f.column}`;
        const val = (c.value || '').trim();
        const isNum = /^-?\d+(\.\d+)?$/.test(val);
        const v = isNum ? val : `'${val.replace(/'/g, "''")}'`;
        switch (c.operator) {
          case 'eq': return `${colRef} = ${v}`;
          case 'like': return `${colRef} LIKE '%${val.replace(/'/g, "''")}%'`;
          case 'gt': return `${colRef} > ${v}`;
          case 'lt': return `${colRef} < ${v}`;
          case 'is_null': return `${colRef} IS NULL`;
          default: return null;
        }
      }).filter(Boolean);
      if (conds.length) where = ' WHERE ' + conds.join(' AND ');
    }

    const sql = `SELECT ${select} ${from}${where} LIMIT 500`;
    sparkExecuteQuery({ systemId, database, sql, page: 1, pageSize: 500 })
      .then((res: any) => {
        setMainRows(res?.rows ?? []);
        const cols = res?.columns ?? [];
        setMainCols(mainFields.length ? mainFields.map((f: any) => f.alias || f.column) : cols);
      })
      .catch((e: any) => setError(e?.message || '查询失败'))
      .finally(() => setLoading(false));
  }, [systemId, database, mainTable, mainTableName, mainFields, db, mainJoins, appliedFilters]);

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
          <div className="flex items-center gap-2">
            {appliedFilters.length > 0 && (
              <Badge color="primary" size="sm">{appliedFilters.length} 个筛选</Badge>
            )}
            <Badge color="neutral" size="sm">{mainRows.length}</Badge>
          </div>
        </div>

        {/* 筛选工具栏 */}
        {filterableFields.length > 0 && (
          <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/40">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-primary-600 transition-colors"
              >
                <Filter size={14} /> 筛选
                <ChevronDown size={13} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
              </button>
              {showFilter && (
                <>
                  <Button size="sm" variant="outline" icon={<Plus size={13} />} onClick={addFilterRow}>添加条件</Button>
                  <Button size="sm" disabled={!draftFilters.length} onClick={applyFilters}>应用筛选</Button>
                  {(draftFilters.length > 0 || appliedFilters.length > 0) && (
                    <Button size="sm" variant="ghost" onClick={clearFilters}>清除</Button>
                  )}
                </>
              )}
            </div>
            {showFilter && (
              <div className="mt-2 space-y-2">
                {draftFilters.length === 0 && (
                  <p className="text-xs text-neutral-400">未添加筛选条件，点击「添加条件」</p>
                )}
                {draftFilters.map((cond, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap">
                    <select
                      value={cond.field}
                      onChange={(e) => updateFilterRow(i, { field: e.target.value })}
                      className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none font-mono"
                    >
                      {filterableOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select
                      value={cond.operator}
                      onChange={(e) => updateFilterRow(i, { operator: e.target.value as FilterOperator })}
                      className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none"
                    >
                      <option value="eq">等于</option>
                      <option value="like">包含</option>
                      <option value="gt">大于</option>
                      <option value="lt">小于</option>
                      <option value="is_null">为空</option>
                    </select>
                    {cond.operator !== 'is_null' && (
                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => updateFilterRow(i, { value: e.target.value })}
                        placeholder="筛选值"
                        className="px-2 py-1.5 text-sm rounded-md border border-neutral-200 bg-white outline-none flex-1 min-w-[140px]"
                      />
                    )}
                    {cond.operator === 'is_null' && (
                      <span className="text-sm text-neutral-400">（无需值）</span>
                    )}
                    <button onClick={() => removeFilterRow(i)} className="p-1.5 rounded text-neutral-400 hover:text-error-500 hover:bg-error-50 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                            <td key={c} className="px-4 py-3 text-sm text-neutral-700 whitespace-nowrap">
                              {maskedCols.has(c) ? maskValue(row[c]) : (row[c] === undefined || row[c] === null ? '—' : String(row[c]))}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Button size="sm" variant="outline" icon={<Layers size={13} />} onClick={() => toggle(rowKey)}>
                              查看明细
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={downloadingRow === rowKey ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                              disabled={!!downloadingRow}
                              onClick={() => downloadRow(row, rowKey)}
                            >
                              下载
                            </Button>
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

  const nodeParts = (node.baseTable || '').split('.');
  const tableName = nodeParts.pop() || node.baseTable;
  const db = database || (nodeParts.length ? nodeParts[0] : '') || 'mi';

  useEffect(() => {
    setLoading(true); setError('');
    const sel = node.fields?.length ? node.fields.map((f: any) => f.alias || f.column).join(', ') : '*';
    const sql = `SELECT ${sel} FROM ${db}.archive.${tableName} WHERE ${node.childField} = '${parentVal}' LIMIT 200`;
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
