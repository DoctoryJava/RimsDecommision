import axios from 'axios';

export interface Result<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PageResult<T> {
  total: number;
  list: T[];
  pageNum: number;
  pageSize: number;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

// JWT 注入
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rims_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 统一 Result 解包 + 错误提示
api.interceptors.response.use(
  (res) => {
    const data = res.data as Result<unknown>;
    // 后端已按 Result 包装，若 code !=200 则抛错
    if (data && typeof data.code === 'number' && data.code !== 200) {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rims_token');
      localStorage.removeItem('rims_user');
      // 不在这里强制跳转，避免循环
    }
    const msg = err.response?.data?.message || err.message || '网络错误';
    return Promise.reject(new Error(msg));
  }
);

export default api;

// 便捷方法
export async function login(username: string, password: string) {
  // 后端接受 {username, password}，兼容 email 作为 username
  const res = await api.post<Result<{ token: string; userId: number; username: string; realName: string }>>('/auth/login', {
    username,
    email: username,
    password,
  });
  return (res.data as Result<{ token: string; userId: number; username: string; realName: string }>).data;
}

export async function getUserInfo() {
  const res = await api.get<Result<{ username: string; email: string; roles: string[]; permissions: string[] }>>('/auth/user-info');
  return (res.data as Result<{ username: string; email: string; roles: string[]; permissions: string[] }>).data;
}

export async function logout() {
  const res = await api.post<Result<null>>('/auth/logout');
  return res.data;
}

// Systems
export async function getSystems(params: { pageNum?: number; pageSize?: number; search?: string; stage?: string } = {}) {
  const res = await api.get<Result<PageResult<any>>>('/systems', { params });
  return (res.data as Result<PageResult<any>>).data;
}
export async function createSystem(data: any) {
  const res = await api.post<Result<any>>('/systems', data);
  return (res.data as Result<any>).data;
}
export async function updateSystem(id: string, data: any) {
  const res = await api.put<Result<any>>(`/systems/${id}`, data);
  return (res.data as Result<any>).data;
}
export async function deleteSystem(id: string) {
  const res = await api.delete<Result<null>>(`/systems/${id}`);
  return res.data;
}
export async function testConnection(data: any) {
  const res = await api.post<Result<{ connected: boolean; message: string }>>('/systems/test-connection', data);
  return (res.data as Result<{ connected: boolean; message: string }>).data;
}

// Users
export async function getUsers(params: any = {}) {
  const res = await api.get<Result<PageResult<any>>>('/users', { params });
  return (res.data as Result<PageResult<any>>).data;
}
export async function createUser(data: any) {
  const res = await api.post<Result<any>>('/users', data);
  return (res.data as Result<any>).data;
}
export async function updateUser(id: string, data: any) {
  const res = await api.put<Result<any>>(`/users/${id}`, data);
  return (res.data as Result<any>).data;
}
export async function deleteUser(id: string) {
  const res = await api.delete<Result<null>>(`/users/${id}`);
  return res.data;
}

// Roles
export async function getRoles(params: any = {}) {
  const res = await api.get<Result<any[]>>('/roles', { params });
  return (res.data as Result<any[]>).data;
}
export async function createRole(data: any) {
  const res = await api.post<Result<any>>('/roles', data);
  return (res.data as Result<any>).data;
}
export async function updateRole(id: string, data: any) {
  const res = await api.put<Result<any>>(`/roles/${id}`, data);
  return (res.data as Result<any>).data;
}
export async function deleteRole(id: string) {
  const res = await api.delete<Result<null>>(`/roles/${id}`);
  return res.data;
}

// Permissions
export async function getPermissions() {
  const res = await api.get<Result<any[]>>('/permissions');
  return (res.data as Result<any[]>).data;
}

// Pages
export async function getPages() {
  const res = await api.get<Result<any[]>>('/pages');
  return (res.data as Result<any[]>).data;
}

// Dashboard
export async function getSystemStats() {
  const res = await api.get<Result<any>>('/systems/stats');
  return (res.data as Result<any>).data;
}
export async function getStorageUsage() {
  const res = await api.get<Result<any[]>>('/storage/usage');
  return (res.data as Result<any[]>).data;
}
export async function getSyncActivity() {
  const res = await api.get<Result<any[]>>('/sync/activity');
  return (res.data as Result<any[]>).data;
}

// Sync
export async function getSyncJobs(params: any = {}) {
  const res = await api.get<Result<PageResult<any>>>('/sync/jobs', { params });
  return (res.data as Result<PageResult<any>>).data;
}
export async function createSyncJob(data: any) {
  const res = await api.post<Result<any>>('/sync/jobs', data);
  return (res.data as Result<any>).data;
}
export async function getSyncJobTableStats(jobId: string) {
  const res = await api.get<Result<any[]>>(`/sync/jobs/${jobId}/tables`);
  return (res.data as Result<any[]>).data;
}
export async function checkAlreadySynced(systemId: string) {
  const res = await api.get<Result<any>>('/sync/check-already-synced', { params: { systemId } });
  return (res.data as Result<any>).data;
}
export async function getSparkSyncedTables(systemId: string) {
  const res = await api.get<Result<any[]>>('/spark-query/synced-tables', { params: { systemId } });
  return (res.data as Result<any[]>).data;
}
export async function getAllSparkSyncedTables() {
  const res = await api.get<Result<any[]>>('/spark-query/all-synced-tables');
  return (res.data as Result<any[]>).data;
}
export async function getSystemSchema(systemId: string) {
  const res = await api.get<Result<any[]>>('/spark-query/system-schema', { params: { systemId } });
  return (res.data as Result<any[]>).data;
}
export async function sparkExecuteQuery(data: any) {
  const res = await api.post<Result<any>>('/spark-query/execute', data);
  return (res.data as Result<any>).data;
}
// 后端直接生成 CSV 流，前端用 blob 触发下载
export async function sparkExportCsv(data: any): Promise<void> {
  const res = await api.post('/spark-query/export', data, { responseType: 'blob' });
  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.filename || 'export') + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 下载本地附件（后端按路径读文件流）；返回文件名供前端命名
export async function downloadAttachment(data: any): Promise<void> {
  const res = await api.post('/attachments/download', data, { responseType: 'blob' });
  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // 从路径取文件名
  const p = data.path || '';
  const name = p.split(/[\\/]/).pop() || 'attachment';
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Schemas
export async function getSchemas(params: any = {}) {
  const res = await api.get<Result<any[]>>('/schemas', { params });
  return (res.data as Result<any[]>).data;
}
export async function getTables() {
  const res = await api.get<Result<any[]>>('/tables');
  return (res.data as Result<any[]>).data;
}
export async function getTableData(table: string, params: any = {}) {
  const res = await api.get<Result<any>>(`/tables/${table}/data`, { params });
  // fallback to /tables/{name} if needed
  return (res.data as Result<any>).data;
}

// Query
export async function getQueryConfigs(systemId?: string) {
  const res = await api.get<Result<any[]>>('/query-configs', { params: systemId ? { systemId } : {} });
  return (res.data as Result<any[]>).data;
}
export async function createQueryConfig(data: any) {
  const res = await api.post<Result<any>>('/query-configs', data);
  return (res.data as Result<any>).data;
}
export async function updateQueryConfig(id: string, data: any) {
  const res = await api.put<Result<any>>(`/query-configs/${id}`, data);
  return (res.data as Result<any>).data;
}
export async function deleteQueryConfig(id: string) {
  const res = await api.delete<Result<null>>(`/query-configs/${id}`);
  return res.data;
}
export async function getDrillConfigs(queryConfigId: string) {
  const res = await api.get<Result<any[]>>(`/query-configs/${queryConfigId}/drills`);
  return (res.data as Result<any[]>).data;
}
export async function createDrillConfig(queryConfigId: string, data: any) {
  const res = await api.post<Result<any>>(`/query-configs/${queryConfigId}/drills`, data);
  return (res.data as Result<any>).data;
}
export async function updateDrillConfig(queryConfigId: string, id: string, data: any) {
  const res = await api.put<Result<any>>(`/query-configs/${queryConfigId}/drills/${id}`, data);
  return (res.data as Result<any>).data;
}
export async function deleteDrillConfig(queryConfigId: string, id: string) {
  const res = await api.delete<Result<null>>(`/query-configs/${queryConfigId}/drills/${id}`);
  return res.data;
}
export async function executeQuery(data: any) {
  const res = await api.post<Result<PageResult<any>>>('/query/execute', data);
  // backend returns Result<PageResult> with sql in message
  const r = res.data as Result<PageResult<any>>;
  return { page: r.data, sql: r.message };
}
export async function getSasUrl(systemId: string, objectKey: string) {
  const res = await api.get<Result<{ sasUrl: string }>>(`/systems/${systemId}/attachments/sas`, { params: { objectKey }});
  return (res.data as Result<{ sasUrl: string }>).data;
}

// ===== Source Databases =====
export async function getSourceDatabases(params: any = {}) {
  const res = await api.get<Result<any[]>>('/source-databases', { params });
  return (res.data as Result<any[]>).data;
}
export async function createSourceDatabase(data: any) {
  const res = await api.post<Result<any>>('/source-databases', data);
  return (res.data as Result<any>).data;
}
export async function updateSourceDatabase(id: string, data: any) {
  const res = await api.put<Result<any>>(`/source-databases/${id}`, data);
  return (res.data as Result<any>).data;
}
export async function deleteSourceDatabase(id: string) {
  const res = await api.delete<Result<null>>(`/source-databases/${id}`);
  return res.data;
}
export async function testSourceDatabase(id: string) {
  const res = await api.post<Result<{ connected: boolean; message: string }>>(`/source-databases/${id}/test-connection`);
  return (res.data as Result<{ connected: boolean; message: string }>).data;
}

// ===== Unstructured sources & items =====
export async function getUnstructuredSources(params: any = {}) {
  const res = await api.get<Result<any[]>>('/unstructured-sources', { params });
  return (res.data as Result<any[]>).data;
}
export async function createUnstructuredSource(data: any) {
  const res = await api.post<Result<any>>('/unstructured-sources', data);
  return (res.data as Result<any>).data;
}
export async function deleteUnstructuredSource(id: string) {
  const res = await api.delete<Result<null>>(`/unstructured-sources/${id}`);
  return res.data;
}
export async function getUnstructuredItems(params: any = {}) {
  const res = await api.get<Result<any[]>>('/unstructured-items', { params });
  return (res.data as Result<any[]>).data;
}

// ===== Archive =====
export async function getArchiveBatches(params: any = {}) {
  const res = await api.get<Result<PageResult<any>>>('/archive/batches', { params });
  return (res.data as Result<PageResult<any>>).data;
}
export async function getArchiveFiles(params: any = {}) {
  const res = await api.get<Result<any[]>>('/archive/files', { params });
  return (res.data as Result<any[]>).data;
}
export async function getArchiveSets(params: any = {}) {
  const res = await api.get<Result<any[]>>('/archive/sets', { params });
  return (res.data as Result<any[]>).data;
}
export async function getArchiveSetItems(setId: string) {
  const res = await api.get<Result<any[]>>(`/archive/sets/${setId}/items`);
  return (res.data as Result<any[]>).data;
}

// ===== Retention =====
export async function getRetentionPolicies() {
  const res = await api.get<Result<any[]>>('/retention/policies');
  return (res.data as Result<any[]>).data;
}
export async function createRetentionPolicy(data: any) {
  const res = await api.post<Result<any>>('/retention/policies', data);
  return (res.data as Result<any>).data;
}
export async function updateRetentionPolicy(id: string, data: any) {
  const res = await api.put<Result<any>>(`/retention/policies/${id}`, data);
  return (res.data as Result<any>).data;
}
export async function deleteRetentionPolicy(id: string) {
  const res = await api.delete<Result<null>>(`/retention/policies/${id}`);
  return res.data;
}
export async function getRetentionAssignments(params: any = {}) {
  const res = await api.get<Result<any[]>>('/retention/assignments', { params });
  return (res.data as Result<any[]>).data;
}
export async function createRetentionAssignment(data: any) {
  const res = await api.post<Result<any>>('/retention/assignments', data);
  return (res.data as Result<any>).data;
}
export async function getRetentionHolds(assignmentId: string) {
  const res = await api.get<Result<any[]>>(`/retention/assignments/${assignmentId}/holds`);
  return (res.data as Result<any[]>).data;
}
export async function holdRetention(assignmentId: string, data: any = {}) {
  const res = await api.post<Result<any>>(`/retention/assignments/${assignmentId}/hold`, data);
  return (res.data as Result<any>).data;
}
export async function releaseRetention(assignmentId: string, data: any = {}) {
  const res = await api.post<Result<any>>(`/retention/assignments/${assignmentId}/release`, data);
  return (res.data as Result<any>).data;
}

// ===== Audit Logs =====
export async function getAuditLogs(params: any = {}) {
  const res = await api.get<Result<PageResult<any>>>('/audit-logs', { params });
  return (res.data as Result<PageResult<any>>).data;
}
export async function getAuditLog(id: string) {
  const res = await api.get<Result<any>>(`/audit-logs/${id}`);
  return (res.data as Result<any>).data;
}
export async function deleteAuditLog(id: string) {
  const res = await api.delete<Result<null>>(`/audit-logs/${id}`);
  return res.data;
}
