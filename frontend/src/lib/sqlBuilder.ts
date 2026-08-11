// 根据查询配置生成主查询 SQL（表别名 + 关联 + 字段限定），供预览展示。
export function buildMainQuerySql({
  baseTable,
  joins = [],
  fields = [],
  database = '',
}: {
  baseTable: string;
  joins?: any[];
  fields?: any[];
  database?: string;
}): string {
  const baseParts = (baseTable || '').split('.');
  const mainName = baseParts.pop() || baseTable;
  const db = database || (baseParts.length ? baseParts[0] : '') || 'mi';

  // <库>.<表> -> <库>.archive.<表>
  const phys = (ref: string) => {
    const p = (ref || '').split('.');
    const t = p.pop() || ref;
    const d = p.length ? p[0] : db;
    return `${d}.archive.${t}`;
  };

  // 表别名：主表 t0，关联表 t1、t2…
  const aliasMap = new Map<string, string>();
  aliasMap.set(baseTable, 't0');
  let aliasIdx = 1;
  const joinClauses = (joins || [])
    .map((j: any) => {
      const rightRef = j.rightTable;
      if (!rightRef) return null;
      const leftRef = j.leftTable || baseTable;
      if (!aliasMap.has(rightRef)) aliasMap.set(rightRef, 't' + aliasIdx++);
      const la = aliasMap.get(leftRef) || 't0';
      const ra = aliasMap.get(rightRef) as string;
      const jt = (j.joinType || 'left').toUpperCase();
      return `${jt} JOIN ${phys(rightRef)} ${ra} ON ${la}.${j.leftColumn} = ${ra}.${j.rightColumn}`;
    })
    .filter(Boolean) as string[];

  let select = '*';
  if (fields.length) {
    const parts = fields
      .map((f: any) => {
        const col = f.column || f.alias || '';
        if (!col) return '';
        const tblRef = f.table || baseTable;
        const a = aliasMap.get(tblRef) || 't0';
        const out = f.alias || col;
        return `${a}.${col} AS ${out}`;
      })
      .filter(Boolean);
    if (parts.length) select = parts.join(', ');
  }

  const from = `FROM ${phys(baseTable)} t0${joinClauses.length ? ' ' + joinClauses.join(' ') : ''}`;
  return `SELECT ${select} ${from} LIMIT 100`;
}
