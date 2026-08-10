export type LifecycleStage = 'active' | 'deprecated' | 'archived' | 'destroyed';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'failed' | 'partial';

export type PermissionCategory = 'admin' | 'tenant';
export type AdminRoleKey = 'super_admin' | 'platform_admin' | 'security_admin';
export type TenantRoleKey = 'system_owner' | 'system_engineer' | 'system_auditor' | 'system_viewer';
export type RoleKey = AdminRoleKey | TenantRoleKey;

export type RoleCategory = 'admin' | 'tenant';

export interface SystemRecord {
  id: string;
  name: string;
  code: string;
  description: string;
  owner: string;
  department: string;
  stage: LifecycleStage;
  createdAt: string;
  archivedAt: string | null;
  dbConfig: DbConfig | null;
  storageConfig: StorageConfig | null;
  lastSync: string | null;
  syncStatus: SyncStatus;
  schemaCount: number;
  tableCount: number;
  dataSizeGB: number;
  tags: string[];
}

export interface DbConfig {
  engine: 'postgresql' | 'mysql' | 'sqlserver' | 'oracle' | 'mongodb';
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
}

export interface StorageConfig {
  provider: 'aws-s3' | 'azure-blob' | 'gcs' | 'minio';
  bucket: string;
  region: string;
  endpoint?: string;
  accessKey: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: RoleKey;
  category: RoleCategory;
  systemIds: string[];
  status: 'active' | 'disabled';
  lastLogin: string | null;
  createdAt: string;
}

export interface RoleRecord {
  id: string;
  key: RoleKey;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  category: RoleCategory;
  color: string;
  isBuiltin: boolean;
}

export interface PermissionRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  module: 'systems' | 'users' | 'roles' | 'data' | 'pages' | 'settings' | 'schemas';
  action: 'view' | 'create' | 'edit' | 'delete' | 'sync' | 'export';
  category: PermissionCategory;
}

export interface PageRecord {
  id: string;
  name: string;
  path: string;
  module: string;
  icon: string;
  visibleTo: RoleKey[];
  order: number;
  enabled: boolean;
}

export interface SchemaRecord {
  id: string;
  systemId: string;
  name: string;
  tables: TableRecord[];
  syncedAt: string;
}

export interface TableRecord {
  id: string;
  name: string;
  columns: number;
  rows: number;
  sizeMB: number;
  archived: boolean;
}

export interface SyncJob {
  id: string;
  systemId: string;
  systemName: string;
  type: 'full' | 'incremental' | 'schema-only';
  status: SyncStatus;
  startedAt: string;
  duration: string;
  records: number;
  triggeredBy: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

// ── Dynamic Query System ──

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'select';
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between' | 'is_null' | 'is_not_null';

export interface PhysicalColumn {
  name: string;
  type: FieldType;
  label: string;
}

export interface PhysicalTable {
  name: string;
  label: string;
  columns: PhysicalColumn[];
  rows: Record<string, string | number | boolean | null>[];
}

export interface JoinConfig {
  id: string;
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
  joinType: 'inner' | 'left' | 'right';
}

export interface FieldMapping {
  id: string;
  alias: string;
  table: string;
  column: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
  render?: 'text' | 'badge' | 'date' | 'tag' | 'link';
  options?: string[];
}

export interface QueryConfig {
  id: string;
  systemId?: string;
  name: string;
  description: string;
  baseTable: string;
  joins: JoinConfig[];
  fields: FieldMapping[];
  defaultSort: { field: string; direction: 'asc' | 'desc' };
  pageSize: number;
  status: 'active' | 'draft';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueryResult {
  rows: Record<string, string | number | boolean | null>[];
  total: number;
  page: number;
  pageSize: number;
  sql: string;
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string;
  value2?: string;
}

