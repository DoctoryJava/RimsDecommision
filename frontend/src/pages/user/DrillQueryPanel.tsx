import { useState } from 'react';
import {
  ChevronRight, ChevronDown, ChevronLeft, X, Database, Table2, Layers, Search,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { drillTables, demoDrillConfigs } from '@/data/drillMockData';

// ===== 类型 =====
export interface DrillChild {
  id: string;
  name: string;
  baseTable: string;
  parentField: string;
  childField: string;
  children: DrillChild[];
}

interface DrillCtx {
  parentRow: Record<string, any>;
  child: DrillChild;
}

type UiMode = 'drawer' | 'inline';

// 递归渲染一个 drill 节点及其子节点
function DrillNode({
  row,
  child,
  uiMode,
  onDrill,
  depth,
}: {
  row: Record<string, any>;
  child: DrillChild;
  uiMode: UiMode;
  onDrill: (ctx: DrillCtx) => void;
  depth: number;
}) {
  const table = drillTables[child.baseTable];
  if (!table) return null;
  const parentVal = row[child.parentField];
  const childRows = table.rows.filter((r) => String(r[child.childField]) === String(parentVal));

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-primary-100 pl-3' : ''}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 rounded-t-lg border border-neutral-200">
        <div className="flex items-center gap-2">
          <Table2 size={14} className="text-primary-500" />
          <span className="text-sm font-medium text-neutral-800">{child.name}</span>
          <Badge color="primary" size="sm">{childRows.length}</Badge>
        </div>
        <span className="text-xs text-neutral-400">关联字段 {child.parentField} = {child.childField}（当前值 {String(parentVal)}）</span>
      </div>
      <div className="overflow-x-auto rounded-b-lg border border-t-0 border-neutral-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500">
              {table.columns.map((c) => <th key={c.name} className="text-left px-3 py-2 font-medium whitespace-nowrap">{c.label}</th>)}
              {child.children.length > 0 && <th className="text-right px-3 py-2 font-medium">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {childRows.length === 0 ? (
              <tr><td colSpan={table.columns.length + (child.children.length ? 1 : 0)} className="text-center py-4 text-neutral-400">无关联数据</td></tr>
            ) : (
              childRows.map((r, i) => (
                <FragmentRow key={i} r={r} table={table} child={child} uiMode={uiMode} onDrill={onDrill} depth={depth} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 单行 + 可选内联展开子级
function FragmentRow({
  r, table, child, uiMode, onDrill, depth,
}: {
  r: Record<string, any>;
  table: typeof drillTables[string];
  child: DrillChild;
  uiMode: UiMode;
  onDrill: (ctx: DrillCtx) => void;
  depth: number;
}) {
  const [inlineOpen, setInlineOpen] = useState(false);
  return (
    <>
      <tr className="hover:bg-neutral-50/50">
        {table.columns.map((c) => (
          <td key={c.name} className="px-3 py-2 text-neutral-700 whitespace-nowrap">
            {r[c.name] === undefined || r[c.name] === null ? '—' : String(r[c.name])}
          </td>
        ))}
        {child.children.length > 0 && (
          <td className="px-3 py-2 text-right whitespace-nowrap">
            <div className="inline-flex items-center gap-1.5">
              {uiMode === 'inline' && (
                <Button size="sm" variant="outline" icon={inlineOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />} onClick={() => setInlineOpen(!inlineOpen)}>
                  明细
                </Button>
              )}
              <Button size="sm" variant="ghost" icon={<Layers size={13} />} onClick={() => onDrill({ parentRow: r, child })}>
                下钻
              </Button>
            </div>
          </td>
        )}
      </tr>
      {inlineOpen && child.children.length > 0 && (
        <tr>
          <td colSpan={table.columns.length + 1} className="px-4 py-2 bg-neutral-50/40">
            {child.children.map((sub) => (
              <DrillNode key={sub.id} row={r} child={sub} uiMode={uiMode} onDrill={onDrill} depth={depth + 1} />
            ))}
          </td>
        </tr>
      )}
    </>
  );
}

export default function DrillQueryPanel() {
  const [uiMode, setUiMode] = useState<UiMode>('drawer');
  const [drawerCtx, setDrawerCtx] = useState<DrillCtx | null>(null);
  // 下钻路径栈（drawer 模式多级）
  const [path, setPath] = useState<DrillCtx[]>([]);

  const drillFrom = demoDrillConfigs[0];

  const openDrawer = (ctx: DrillCtx) => {
    setPath([ctx]);
    setDrawerCtx(ctx);
  };
  const drillDeeper = (ctx: DrillCtx) => {
    setPath((p) => [...p, ctx]);
    setDrawerCtx(ctx);
  };
  const goBack = () => {
    setPath((p) => {
      const np = p.slice(0, -1);
      setDrawerCtx(np.length ? np[np.length - 1] : null);
      return np;
    });
  };

  const renderDrill = (ctx: DrillCtx, depth: number) => (
    <DrillNode
      key={ctx.child.id}
      row={ctx.parentRow}
      child={ctx.child}
      uiMode={uiMode}
      onDrill={drawerCtx ? drillDeeper : onDrawerFromInline}
      depth={depth}
    />
  );

  const onDrawerFromInline = (ctx: DrillCtx) => { setDrawerCtx(ctx); setPath([ctx]); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="关联明细下钻"
          subtitle="订单 → 订单行 → 物流；订单 → 备注 / 客服留言"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 mr-1">展示方式</span>
          <button onClick={() => setUiMode('drawer')} className={`px-3 py-1.5 text-sm rounded-lg border ${uiMode === 'drawer' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-neutral-600 border-neutral-200'}`}>右侧抽屉</button>
          <button onClick={() => setUiMode('inline')} className={`px-3 py-1.5 text-sm rounded-lg border ${uiMode === 'inline' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-neutral-600 border-neutral-200'}`}>行内展开</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 主表（订单） */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-primary-500" />
              <h3 className="text-base font-semibold text-neutral-900">订单（orders）</h3>
            </div>
            <Badge color="neutral" size="sm">{drillTables.orders.rows.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  {drillTables.orders.columns.map((c) => <th key={c.name} className="text-left px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">{c.label}</th>)}
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-600 uppercase tracking-wider">明细</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {drillTables.orders.rows.map((row) => (
                  <tr key={row.order_id} className="hover:bg-neutral-50/50">
                    {drillTables.orders.columns.map((c) => (
                      <td key={c.name} className="px-4 py-3 text-sm text-neutral-700 whitespace-nowrap">{String(row[c.name])}</td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" icon={<Layers size={13} />} onClick={() => openDrawer({ parentRow: row, child: drillFrom })}>查看明细</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 说明 */}
        <Card className="p-5">
          <h3 className="text-base font-semibold text-neutral-900 mb-3">说明</h3>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            这是「配置化关联明细下钻」的交互演示（当前用模拟数据）。
            配置里定义：主表(orders) → 订单行(order_items) → 物流(shipments)，
            以及订单 → 备注(order_notes) / 客服留言(customer_messages)。
            点某行「查看明细」可逐级下钻。
          </p>
          <div className="space-y-1 text-xs text-neutral-500">
            <p>· orders.order_id = order_items.order_id</p>
            <p>· order_items.item_id = shipments.item_id</p>
            <p>· orders.order_id = order_notes.order_id</p>
            <p>· orders.order_id = customer_messages.order_id</p>
          </div>
        </Card>
      </div>

      {/* 行内模式下，主表每行已通过 FragmentRow 内联展开；此处提供抽屉入口（可多级） */}
      {uiMode === 'drawer' && drawerCtx && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-neutral-950/40" onClick={() => { setDrawerCtx(null); setPath([]); }} />
          <div className="relative ml-auto w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                {path.length > 1 && <Button size="sm" variant="ghost" icon={<ChevronLeft size={15} />} onClick={goBack}>返回</Button>}
                <h3 className="text-lg font-semibold text-neutral-900">关联明细</h3>
              </div>
              <button onClick={() => { setDrawerCtx(null); setPath([]); }} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {path.map((ctx, i) => (
                <div key={ctx.child.id + i}>{renderDrill(ctx, i)}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
