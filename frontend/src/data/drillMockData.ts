// 模拟多级下钻演示数据：订单 -> 订单行 -> 物流；订单 -> 备注 / 客服留言

export interface MockTable {
  name: string;
  label: string;
  columns: { name: string; label: string; type: string }[];
  rows: Record<string, any>[];
}

// 订单主表
const orders: MockTable = {
  name: 'orders',
  label: '订单',
  columns: [
    { name: 'order_id', label: '订单编号', type: 'string' },
    { name: 'customer_name', label: '客户名称', type: 'string' },
    { name: 'amount', label: '订单金额', type: 'number' },
    { name: 'status', label: '状态', type: 'string' },
    { name: 'order_date', label: '下单日期', type: 'date' },
  ],
  rows: [
    { order_id: 'ORD-2026-0001', customer_name: '张伟', amount: 598, status: 'completed', order_date: '2026-07-01' },
    { order_id: 'ORD-2026-0002', customer_name: '李娜', amount: 1299, status: 'shipped', order_date: '2026-07-03' },
    { order_id: 'ORD-2026-0003', customer_name: '王芳', amount: 250, status: 'pending', order_date: '2026-07-05' },
  ],
};

// 订单行（主表 orders.order_id -> 子表 order_items.order_id）
const orderItems: MockTable = {
  name: 'order_items',
  label: '订单行',
  columns: [
    { name: 'item_id', label: '订单行ID', type: 'string' },
    { name: 'order_id', label: '订单编号', type: 'string' },
    { name: 'product_name', label: '产品', type: 'string' },
    { name: 'quantity', label: '数量', type: 'number' },
    { name: 'unit_price', label: '单价', type: 'number' },
  ],
  rows: [
    { item_id: 'ITM-0001-1', order_id: 'ORD-2026-0001', product_name: '无线蓝牙耳机', quantity: 2, unit_price: 299 },
    { item_id: 'ITM-0001-2', order_id: 'ORD-2026-0001', product_name: '保温杯', quantity: 1, unit_price: 50 },
    { item_id: 'ITM-0002-1', order_id: 'ORD-2026-0002', product_name: '智能手表', quantity: 1, unit_price: 1299 },
    { item_id: 'ITM-0003-1', order_id: 'ORD-2026-0003', product_name: '保温杯', quantity: 5, unit_price: 50 },
  ],
};

// 物流（订单行 item_id -> 物流 item_id，一个订单行可有多条物流）
const shipments: MockTable = {
  name: 'shipments',
  label: '物流',
  columns: [
    { name: 'shipment_id', label: '物流单号', type: 'string' },
    { name: 'item_id', label: '订单行ID', type: 'string' },
    { name: 'carrier', label: '承运商', type: 'string' },
    { name: 'status', label: '物流状态', type: 'string' },
    { name: 'track_no', label: '运单号', type: 'string' },
  ],
  rows: [
    { shipment_id: 'SHP-1-1', item_id: 'ITM-0001-1', carrier: '顺丰', status: '已签收', track_no: 'SF1001' },
    { shipment_id: 'SHP-1-2', item_id: 'ITM-0001-1', carrier: '中通', status: '运输中', track_no: 'ZT1002' },
    { shipment_id: 'SHP-2-1', item_id: 'ITM-0002-1', carrier: '京东', status: '已发货', track_no: 'JD2001' },
    { shipment_id: 'SHP-3-1', item_id: 'ITM-0003-1', carrier: '韵达', status: '待揽收', track_no: 'YD3001' },
  ],
};

// 备注（orders.order_id -> order_notes.order_id）
const orderNotes: MockTable = {
  name: 'order_notes',
  label: '订单备注',
  columns: [
    { name: 'note_id', label: '备注ID', type: 'string' },
    { name: 'order_id', label: '订单编号', type: 'string' },
    { name: 'note', label: '备注内容', type: 'string' },
    { name: 'created_at', label: '时间', type: 'date' },
  ],
  rows: [
    { note_id: 'N-1-1', order_id: 'ORD-2026-0001', note: '客户要求礼品包装', created_at: '2026-07-01 10:00' },
    { note_id: 'N-1-2', order_id: 'ORD-2026-0001', note: '发票抬头为公司', created_at: '2026-07-01 10:30' },
    { note_id: 'N-2-1', order_id: 'ORD-2026-0002', note: '周末送达', created_at: '2026-07-03 14:00' },
  ],
};

// 客服留言（orders.order_id -> customer_messages.order_id）
const customerMessages: MockTable = {
  name: 'customer_messages',
  label: '客服留言',
  columns: [
    { name: 'msg_id', label: '留言ID', type: 'string' },
    { name: 'order_id', label: '订单编号', type: 'string' },
    { name: 'message', label: '留言内容', type: 'string' },
    { name: 'agent', label: '客服', type: 'string' },
    { name: 'created_at', label: '时间', type: 'date' },
  ],
  rows: [
    { msg_id: 'M-1-1', order_id: 'ORD-2026-0001', message: '请问发货了吗？', agent: '客服A', created_at: '2026-07-02 09:00' },
    { msg_id: 'M-1-2', order_id: 'ORD-2026-0001', message: '可以改地址吗？', agent: '客服B', created_at: '2026-07-02 10:00' },
    { msg_id: 'M-2-1', order_id: 'ORD-2026-0002', message: '收到货了，很好', agent: '客服A', created_at: '2026-07-05 11:00' },
  ],
};

export const drillTables: Record<string, MockTable> = {
  orders,
  order_items: orderItems,
  shipments,
  order_notes: orderNotes,
  customer_messages: customerMessages,
};

// 演示下钻配置：订单主表下挂 订单行/备注/客服留言；订单行再挂 物流
export const demoDrillConfigs = [
  {
    id: 'drill-orders',
    name: '订单明细',
    baseTable: 'orders',
    parentField: 'order_id',
    childField: 'order_id',
    children: [
      {
        id: 'd-order-items',
        name: '订单行',
        baseTable: 'order_items',
        parentField: 'order_id',   // 父（订单）的外键字段
        childField: 'order_id',    // 子（订单行）的关联字段
        children: [
          {
            id: 'd-item-shipments',
            name: '物流信息',
            baseTable: 'shipments',
            parentField: 'item_id', // 父（订单行）的外键字段
            childField: 'item_id',  // 子（物流）的关联字段
            children: [],
          },
        ],
      },
      {
        id: 'd-order-notes',
        name: '订单备注',
        baseTable: 'order_notes',
        parentField: 'order_id',
        childField: 'order_id',
        children: [],
      },
      {
        id: 'd-order-messages',
        name: '客服留言',
        baseTable: 'customer_messages',
        parentField: 'order_id',
        childField: 'order_id',
        children: [],
      },
    ],
  },
];
