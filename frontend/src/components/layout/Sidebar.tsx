import { useState } from 'react';
import {
  LayoutDashboard,
  Server,
  RefreshCw,
  Database,
  Users,
  ShieldCheck,
  Key,
  FileText,
  ChevronLeft,
  ChevronsLeft,
  LogOut,
  Search,
  Bell,
  HardDrive,
  TableProperties,
  SlidersHorizontal,
  Search as SearchIcon,
  Archive,
  Tag as TagIcon,
  Monitor,
  Wrench,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';

export type PageKey =
  | 'dashboard'
  | 'systems'
  | 'data-sync'
  | 'schemas'
  | 'query-configs'
  | 'dynamic-query'
  | 'db-inspector'
  | 'data-sources'
  | 'archive'
  | 'retention'
  | 'tags'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'pages';

interface SidebarProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  onLogout: () => void;
}

type NavItem = { key: PageKey; label: string; icon: typeof LayoutDashboard; badge?: string };
type NavGroup = { label: string; items: NavItem[] };
type NavSection = { title: string; icon: typeof LayoutDashboard; groups: NavGroup[] };

/** Two top-level tiers based on who uses the app:
 *  - End User (前台使用端): consumed by each system's own end users
 *  - Admin (后台管理端): platform administrators / back-office
 *  Each tier has second-level groups. Menu labels are English. */
const navSections: NavSection[] = [
  {
    title: 'End User',
    icon: Monitor,
    groups: [
      {
        label: 'Overview',
        items: [{ key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'Data Sources',
        items: [{ key: 'data-sources', label: 'Data Sources', icon: Database }],
      },
      {
        label: 'Data',
        items: [
          { key: 'dynamic-query', label: 'Dynamic Query', icon: SearchIcon },
          { key: 'query-configs', label: 'Query Configs', icon: SlidersHorizontal },
          { key: 'db-inspector', label: 'Table Inspector', icon: TableProperties },
        ],
      },
    ],
  },
  {
    title: 'Admin',
    icon: Wrench,
    groups: [
      {
        label: 'Access Control',
        items: [
          { key: 'users', label: 'Users', icon: Users },
          { key: 'roles', label: 'Roles', icon: ShieldCheck },
          { key: 'permissions', label: 'Permissions', icon: Key },
          { key: 'pages', label: 'Page Management', icon: FileText },
        ],
      },
      {
        label: 'Systems & Data',
        items: [
          { key: 'systems', label: 'Decommissioned Systems', icon: Server, badge: '6' },
          { key: 'data-sync', label: 'Data Sync', icon: RefreshCw },
          { key: 'schemas', label: 'Schema Browser', icon: Database },
        ],
      },
      {
        label: 'Archive & Compliance',
        items: [
          { key: 'archive', label: 'Archive Artifacts', icon: Archive },
          { key: 'retention', label: 'Retention & Compliance', icon: ShieldCheck },
          { key: 'tags', label: 'Tags', icon: TagIcon },
        ],
      },
    ],
  },
];

export default function Sidebar({ current, onNavigate, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? 'w-[68px]' : 'w-64'} flex flex-col bg-neutral-950 border-r border-neutral-800/50 transition-all duration-300 shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-neutral-800/50">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
          <HardDrive size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Lifecycle</p>
            <p className="text-xs text-neutral-500 whitespace-nowrap">Data Retention Suite</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.title} className="mb-6">
              {!collapsed && (
                <div className="flex items-center gap-2 px-3 mb-2">
                  <SectionIcon size={13} className="text-primary-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-300/80">
                    {section.title}
                  </p>
                </div>
              )}
              {collapsed && (
                <div className="px-2 mb-2">
                  <SectionIcon size={15} className="text-primary-400/70 mx-auto" />
                </div>
              )}
              <div className="space-y-4">
                {section.groups.map((group) => (
                  <div key={group.label}>
                    {!collapsed && (
                      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                        {group.label}
                      </p>
                    )}
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = current === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => onNavigate(item.key)}
                          title={collapsed ? item.label : undefined}
                          className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5 ${
                            active
                              ? 'bg-primary-500/10 text-primary-300'
                              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                          }`}
                        >
                          <Icon size={18} className={`shrink-0 ${active ? 'text-primary-400' : ''}`} />
                          {!collapsed && <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>}
                          {!collapsed && item.badge && (
                            <Badge color={active ? 'primary' : 'neutral'} variant={active ? 'soft' : 'solid'} size="sm">
                              {item.badge}
                            </Badge>
                          )}
                          {collapsed && item.badge && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User & Collapse */}
      <div className="border-t border-neutral-800/50 p-2">
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-800/50 cursor-pointer transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            SC
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">Sarah Chen</p>
              <p className="text-xs text-neutral-500 truncate">Super Admin</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={onLogout} className="p-1.5 rounded text-neutral-500 hover:text-error-400 hover:bg-neutral-800 transition-colors">
              <LogOut size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 transition-colors"
        >
          {collapsed ? <ChevronLeft size={16} className="rotate-180" /> : <ChevronsLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

export function TopBar({ title }: { title: string }) {
  return (
    <header className="h-16 px-6 flex items-center justify-between bg-white border-b border-neutral-200 shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search systems, schemas, users..."
            className="w-64 pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>
        <button className="relative p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error-500 ring-2 ring-white" />
        </button>
        <div className="w-px h-8 bg-neutral-200" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white text-sm font-semibold">
            SC
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-neutral-800 leading-tight">Sarah Chen</p>
            <p className="text-xs text-neutral-500 leading-tight">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
