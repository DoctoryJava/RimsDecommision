import { useState, useEffect } from 'react';
import Sidebar, { type PageKey, TopBar } from '@/components/Sidebar';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import SystemsPage from '@/pages/SystemsPage';
import DataSyncPage from '@/pages/DataSyncPage';
import SchemasPage from '@/pages/SchemasPage';
import UsersPage from '@/pages/UsersPage';
import RolesPage from '@/pages/RolesPage';
import PermissionsPage from '@/pages/PermissionsPage';
import PagesPage from '@/pages/PagesPage';
import SettingsPage from '@/pages/SettingsPage';
import QueryConfigsPage from '@/pages/QueryConfigsPage';
import DynamicQueryPage from '@/pages/DynamicQueryPage';
import DbInspectorPage from '@/pages/DbInspectorPage';
import { initialQueryConfigs } from '@/data/queryData';
import type { QueryConfig } from '@/types';

const pageTitles: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  systems: 'Systems',
  'data-sync': 'Data Sync',
  schemas: 'Schema Browser',
  'query-configs': '查询配置管理',
  'dynamic-query': '动态查询',
  'db-inspector': '数据库表结构',
  users: 'Users',
  roles: 'Roles',
  permissions: 'Permissions',
  pages: 'Page Management',
  settings: 'Settings',
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('rims_token'));
  const [page, setPage] = useState<PageKey>('dashboard');
  const [queryConfigs, setQueryConfigs] = useState<QueryConfig[]>(initialQueryConfigs);

  // 若刷新后 token 仍在，保持登录态；也可在此预加载 user-info
  useEffect(() => {
    const token = localStorage.getItem('rims_token');
    if (token) setLoggedIn(true);
  }, []);

  const handleLogin = () => setLoggedIn(true);
  const handleLogout = () => {
    localStorage.removeItem('rims_token');
    localStorage.removeItem('rims_user');
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar current={page} onNavigate={setPage} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={pageTitles[page]} />
        <main className="flex-1 overflow-y-auto">
          {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
          {page === 'systems' && <SystemsPage onNavigateSystems={() => {}} />}
          {page === 'data-sync' && <DataSyncPage />}
          {page === 'schemas' && <SchemasPage />}
          {page === 'query-configs' && <QueryConfigsPage configs={queryConfigs} setConfigs={setQueryConfigs} />}
          {page === 'dynamic-query' && <DynamicQueryPage configs={queryConfigs} />}
          {page === 'db-inspector' && <DbInspectorPage />}
          {page === 'users' && <UsersPage />}
          {page === 'roles' && <RolesPage />}
          {page === 'permissions' && <PermissionsPage />}
          {page === 'pages' && <PagesPage />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
