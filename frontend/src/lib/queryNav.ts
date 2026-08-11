// 轻量跨页导航目标：QueryConfigs 点击「查询」跳到 Dynamic Query 并选中该配置。
let target: { configId: string; systemId?: string } | null = null;

export function setDrillTarget(configId: string, systemId?: string) {
  target = { configId, systemId };
}

export function consumeDrillTarget(): { configId: string; systemId?: string } | null {
  const t = target;
  target = null;
  return t;
}
