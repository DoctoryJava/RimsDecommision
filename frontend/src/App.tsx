import { useState, useEffect, useCallback } from 'react';
import Sidebar, { type PageKey, TopBar } from '@/components/layout/Sidebar';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import SystemsPage from '@/pages/admin/systems/SystemsPage';
import DataSyncPage from '@/pages/admin/systems/DataSyncPage';
import SchemasPage from '@/pages/admin/systems/SchemasPage';
import UsersPage from '@/pages/admin/access/UsersPage';
import RolesPage from '@/pages/admin/access/RolesPage';
import PermissionsPage from '@/pages/admin/access/PermissionsPage';
import PagesPage from '@/pages/admin/access/PagesPage';
import QueryConfigsPage from '@/pages/user/QueryConfigsPage';
import DynamicQueryPage from '@/pages/user/DynamicQueryPage';
import DataSourcesPage from '@/pages/user/DataSourcesPage';
import ArchivePage from '@/pages/admin/archive/ArchivePage';
import RetentionPage from '@/pages/admin/archive/RetentionPage';
import TagsPage from '@/pages/admin/archive/TagsPage';
import AuditLogPage from '@/pages/admin/audit/AuditLogPage';

const pageTitles: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  systems: 'Decommissioned Systems',
  'data-sync': 'Data Sync',
  schemas: 'Schema Browser',
  'query-configs': 'Query Configs',
  'dynamic-query': 'Dynamic Query',
  'data-sources': 'Data Sources',
  archive: 'Archive Artifacts',
  retention: 'Retention & Compliance',
  tags: 'Tags',
  users: 'Users',
  roles: 'Roles',
  permissions: 'Permissions',
  pages: 'Page Management',
  'audit-log': 'Audit Log',
};

/** PageKey -> URL hash route (e.g. "systems" -> "#/systems"). */
const routeByKey: Record<PageKey, string> = {
  dashboard: '/dashboard',
  systems: '/systems',
  'data-sync': '/data-sync',
  schemas: '/schemas',
  'query-configs': '/query-configs',
  'dynamic-query': '/dynamic-query',
  'data-sources': '/data-sources',
  archive: '/archive',
  retention: '/retention',
  tags: '/tags',
  users: '/users',
  roles: '/roles',
  permissions: '/permissions',
  pages: '/pages',
  'audit-log': '/audit-log',
};

/** URL hash route -> PageKey. */
const keyByRoute: Record<string, PageKey> = Object.fromEntries(
  (Object.keys(routeByKey) as PageKey[]).map((k) => [routeByKey[k], k]),
);

/** 从当前 location.hash 解析出当前页面，未知或为空时回落到 dashboard。 */
function pageFromHash(): PageKey {
  const hash = window.location.hash.replace(/^#/, '');
  return keyByRoute[hash] ?? 'dashboard';
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('rims_token'));
  const [page, setPage] = useState<PageKey>(pageFromHash);

  // 若刷新后 token 仍在，保持登录态；也可在此预加载 user-info
  useEffect(() => {
    const token = localStorage.getItem('rims_token');
    if (token) setLoggedIn(true);
  }, []);

  // 监听 hashchange，支持浏览器前进/后退与手动改地址
  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((p: PageKey) => {
    window.location.hash = routeByKey[p];
    setPage(p);
  }, []);

  const handleLogin = () => setLoggedIn(true);
  const handleLogout = () => {
    localStorage.removeItem('rims_token');
    localStorage.removeItem('rims_user');
    setLoggedIn(false);
    window.location.hash = routeByKey.dashboard;
  };

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar current={page} onNavigate={navigate} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={pageTitles[page]} />
        <main className="flex-1 overflow-y-auto">
          {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
          {page === 'systems' && <SystemsPage onNavigateSystems={() => navigate('dashboard')} />}
          {page === 'data-sync' && <DataSyncPage />}
          {page === 'schemas' && <SchemasPage />}
          {page === 'query-configs' && <QueryConfigsPage onNavigate={navigate} />}
          {page === 'dynamic-query' && <DynamicQueryPage />}
          {page === 'data-sources' && <DataSourcesPage onNavigate={navigate} />}
          {page === 'archive' && <ArchivePage />}
          {page === 'retention' && <RetentionPage />}
          {page === 'tags' && <TagsPage />}
          {page === 'users' && <UsersPage />}
          {page === 'roles' && <RolesPage />}
          {page === 'permissions' && <PermissionsPage />}
          {page === 'pages' && <PagesPage />}
          {page === 'audit-log' && <AuditLogPage />}
        </main>
      </div>
    </div>
  );
}
