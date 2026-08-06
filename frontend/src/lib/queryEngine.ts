import type {
  QueryConfig,
  QueryResult,
  FilterCondition,
  PhysicalTable,
} from '@/types';
import { physicalTables } from '@/data/queryData';

function getTable(name: string): PhysicalTable | undefined {
  return physicalTables.find((t) => t.name === name);
}

export function executeQuery(
  config: QueryConfig,
  filters: FilterCondition[],
  sortField: string | null,
  sortDirection: 'asc' | 'desc',
  page: number,
  pageSize: number,
): QueryResult {
  const baseTable = getTable(config.baseTable);
  if (!baseTable) {
    return { rows: [], total: 0, page, pageSize, sql: '-- base table not found' };
  }

  const visibleFields = config.fields.filter((f) => f.visible);
  const fieldMap = new Map(config.fields.map((f) => [f.alias, f]));

  let rows: Record<string, string | number | boolean | null>[] = [];

  if (config.joins.length === 0) {
    rows = baseTable.rows.map((r) => projectRow(r, config.baseTable, visibleFields));
  } else {
    rows = joinTables(config, baseTable, visibleFields);
  }

  rows = applyFilters(rows, filters, fieldMap);
  rows = applySort(rows, sortField || config.defaultSort.field, sortDirection || config.defaultSort.direction, fieldMap);

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  const sql = generateSQL(config, filters, sortField || config.defaultSort.field, sortDirection || config.defaultSort.direction, page, pageSize);

  return { rows: paged, total, page, pageSize, sql };
}

function projectRow(
  row: Record<string, string | number | boolean | null>,
  tableName: string,
  fields: QueryConfig['fields'],
): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  for (const f of fields) {
    if (f.table === tableName) {
      result[f.alias] = row[f.column] ?? null;
    }
  }
  return result;
}

function joinTables(
  config: QueryConfig,
  baseTable: PhysicalTable,
  visibleFields: QueryConfig['fields'],
): Record<string, string | number | boolean | null>[] {
  let result = baseTable.rows.map((r) => {
    const row: Record<string, string | number | boolean | null> = {};
    for (const f of visibleFields) {
      if (f.table === config.baseTable) {
        row[f.alias] = r[f.column] ?? null;
      }
    }
    return row;
  });

  for (const join of config.joins) {
    const rightTable = getTable(join.rightTable);
    if (!rightTable) continue;

    const leftAlias = config.fields.find(
      (f) => f.table === join.leftTable && f.column === join.leftColumn,
    )?.alias;
    if (!leftAlias) continue;

    if (join.joinType === 'inner' || join.joinType === 'left') {
      result = result.map((leftRow) => {
        const leftVal = leftRow[leftAlias];
        const match = rightTable.rows.find((rr) => rr[join.rightColumn] === leftVal);
        if (match) {
          const merged = { ...leftRow };
          for (const f of visibleFields) {
            if (f.table === join.rightTable) {
              merged[f.alias] = match[f.column] ?? null;
            }
          }
          return merged;
        }
        if (join.joinType === 'left') {
          const merged = { ...leftRow };
          for (const f of visibleFields) {
            if (f.table === join.rightTable) merged[f.alias] = null;
          }
          return merged;
        }
        return null;
      }).filter(Boolean) as Record<string, string | number | boolean | null>[];
    } else if (join.joinType === 'right') {
      const newRows: Record<string, string | number | boolean | null>[] = [];
      for (const rightRow of rightTable.rows) {
        const match = result.find((lr) => lr[leftAlias] === rightRow[join.rightColumn]);
        const merged: Record<string, string | number | boolean | null> = {};
        for (const f of visibleFields) {
          if (f.table === join.rightTable) {
            merged[f.alias] = rightRow[f.column] ?? null;
          } else if (match) {
            merged[f.alias] = match[f.alias] ?? null;
          } else {
            merged[f.alias] = null;
          }
        }
        newRows.push(merged);
      }
      result = newRows;
    }
  }

  return result;
}

function applyFilters(
  rows: Record<string, string | number | boolean | null>[],
  filters: FilterCondition[],
  fieldMap: Map<string, QueryConfig['fields'][number]>,
): Record<string, string | number | boolean | null>[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((cond) => {
      const field = fieldMap.get(cond.field);
      if (!field) return true;
      const val = row[cond.field];
      switch (cond.operator) {
        case 'eq': return String(val) === cond.value;
        case 'ne': return String(val) !== cond.value;
        case 'gt': return Number(val) > Number(cond.value);
        case 'gte': return Number(val) >= Number(cond.value);
        case 'lt': return Number(val) < Number(cond.value);
        case 'lte': return Number(val) <= Number(cond.value);
        case 'like': return String(val).toLowerCase().includes(cond.value.toLowerCase());
        case 'in': return cond.value.split(',').map((v) => v.trim()).includes(String(val));
        case 'between': return Number(val) >= Number(cond.value) && Number(val) <= Number(cond.value2 || '0');
        case 'is_null': return val === null || val === undefined || val === '';
        case 'is_not_null': return val !== null && val !== undefined && val !== '';
        default: return true;
      }
    }),
  );
}

function applySort(
  rows: Record<string, string | number | boolean | null>[],
  field: string,
  direction: 'asc' | 'desc',
  _fieldMap: Map<string, QueryConfig['fields'][number]>,
): Record<string, string | number | boolean | null>[] {
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return direction === 'asc' ? av - bv : bv - av;
    }
    const cmp = String(av).localeCompare(String(bv));
    return direction === 'asc' ? cmp : -cmp;
  });
}

function generateSQL(
  config: QueryConfig,
  filters: FilterCondition[],
  sortField: string,
  sortDirection: 'asc' | 'desc',
  page: number,
  pageSize: number,
): string {
  const visibleFields = config.fields.filter((f) => f.visible);
  const selectClause = visibleFields
    .map((f) => `${f.table}.${f.column} AS ${f.alias}`)
    .join(', ');

  let sql = `SELECT ${selectClause}\nFROM ${config.baseTable}`;

  for (const join of config.joins) {
    const joinKeyword = join.joinType === 'inner' ? 'INNER JOIN' : join.joinType === 'left' ? 'LEFT JOIN' : 'RIGHT JOIN';
    sql += `\n${joinKeyword} ${join.rightTable} ON ${join.leftTable}.${join.leftColumn} = ${join.rightTable}.${join.rightColumn}`;
  }

  const fieldMap = new Map(config.fields.map((f) => [f.alias, f]));
  const whereParts = filters.map((cond) => {
    const field = fieldMap.get(cond.field);
    if (!field) return '';
    const col = `${field.table}.${field.column}`;
    switch (cond.operator) {
      case 'eq': return `${col} = '${cond.value}'`;
      case 'ne': return `${col} != '${cond.value}'`;
      case 'gt': return `${col} > ${cond.value}`;
      case 'gte': return `${col} >= ${cond.value}`;
      case 'lt': return `${col} < ${cond.value}`;
      case 'lte': return `${col} <= ${cond.value}`;
      case 'like': return `${col} LIKE '%${cond.value}%'`;
      case 'in': return `${col} IN (${cond.value.split(',').map((v) => `'${v.trim()}'`).join(', ')})`;
      case 'between': return `${col} BETWEEN ${cond.value} AND ${cond.value2}`;
      case 'is_null': return `${col} IS NULL`;
      case 'is_not_null': return `${col} IS NOT NULL`;
      default: return '';
    }
  }).filter(Boolean);

  if (whereParts.length > 0) {
    sql += `\nWHERE ${whereParts.join(' AND ')}`;
  }

  const sortFieldDef = config.fields.find((f) => f.alias === sortField);
  if (sortFieldDef) {
    sql += `\nORDER BY ${sortFieldDef.table}.${sortFieldDef.column} ${sortDirection.toUpperCase()}`;
  }

  const offset = (page - 1) * pageSize;
  sql += `\nLIMIT ${pageSize} OFFSET ${offset}`;

  return sql;
}

export function getEnumOptions(config: QueryConfig, fieldAlias: string): string[] {
  const field = config.fields.find((f) => f.alias === fieldAlias);
  return field?.options || [];
}
