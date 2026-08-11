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
  SlidersHorizontal,
  Search as SearchIcon,
  Archive,
  Monitor,
  Wrench,
  ScrollText,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';

export type PageKey =
  | 'dashboard'
  | 'systems'
  | 'data-sync'
  | 'schemas'
  | 'query-configs'
  | 'dynamic-query'
  | 'data-sources'
  | 'archive'
  | 'retention'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'pages'
  | 'audit-log';

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
        label: 'Projects',
        items: [
          { key: 'systems', label: 'Decommissioned Systems', icon: Server, badge: '6' },
          { key: 'data-sources', label: 'Data Sources', icon: Database },
        ],
      },
      {
        label: 'Data',
        items: [
          { key: 'query-configs', label: 'Query Configs', icon: SlidersHorizontal },
          { key: 'dynamic-query', label: 'Dynamic Query', icon: SearchIcon },
        ],
      },
    ],
  },
  {
    title: 'Admin',
    icon: Wrench,
    groups: [
      {
        label: 'Systems & Data',
        items: [
          { key: 'data-sync', label: 'Data Sync', icon: RefreshCw },
          { key: 'schemas', label: 'Schema Browser', icon: Database },
          { key: 'audit-log', label: 'Audit Log', icon: ScrollText },
        ],
      },
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
        label: 'Archive & Compliance',
        items: [
          { key: 'archive', label: 'Archive Artifacts', icon: Archive },
          { key: 'retention', label: 'Retention & Compliance', icon: ShieldCheck },
        ],
      },
    ],
  },
];

export default function Sidebar({ current, onNavigate, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? 'w-[68px]' : 'w-64'} relative flex flex-col tech-sidebar-bg border-r border-white/5 transition-all duration-300 shrink-0 overflow-hidden`}
    >
      {/* 网格底纹 + 顶部发光描边 */}
      <div className="tech-grid-overlay" />
      <div className="tech-topline" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-4 h-16 border-b border-white/5">
        <div className="w-9 h-9 rounded-lg logo-cyber flex items-center justify-center shrink-0">
          <HardDrive size={20} className="text-white drop-shadow" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Lifecycle</p>
            <p className="text-[10px] text-primary-300/80 whitespace-nowrap font-mono tracking-widest uppercase">Data Retention Suite</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto py-4 px-2.5">
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.title} className="mb-5">
              {!collapsed && (
                <div className="flex items-center gap-2 px-3 mb-2">
                  <span className="w-3.5 h-3.5 rounded-sm bg-primary-500/20 border border-primary-500/40 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-sm bg-primary-400 shadow-[0_0_6px_rgba(52,120,246,0.9)]" />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-300/90">
                    {section.title}
                  </p>
                  <span className="flex-1 h-px section-rule" />
                </div>
              )}
              {collapsed && (
                <div className="px-2 mb-2 flex justify-center">
                  <span className="w-5 h-px section-rule" />
                </div>
              )}
              <div className="space-y-4">
                {section.groups.map((group) => (
                  <div key={group.label}>
                    {!collapsed && (
                      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
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
                          className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5 overflow-hidden ${
                            active
                              ? 'nav-item-glow text-white bg-primary-500/15'
                              : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/5'
                          }`}
                        >
                          {/* 激活左侧霓虹条 */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-gradient-to-b from-primary-400 to-secondary-400 shadow-[0_0_10px_rgba(52,120,246,0.9)]" />
                          )}
                          <span className={`relative w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 ${active ? 'nav-icon-cyber' : 'bg-white/[0.04] border border-white/5 group-hover:border-primary-500/40 group-hover:bg-primary-500/10'}`}>
                            <Icon size={16} className={`transition-colors ${active ? 'text-primary-300 drop-shadow-[0_0_4px_rgba(89,157,255,0.8)]' : 'text-neutral-500 group-hover:text-primary-300'}`} />
                          </span>
                          {!collapsed && <span className={`flex-1 text-left whitespace-nowrap ${active ? 'font-semibold' : ''}`}>{item.label}</span>}
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
      <div className="relative border-t border-white/5 p-2 bg-white/[0.02]">
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-[0_0_12px_-2px_rgba(16,185,129,0.7)]">
            SC
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">Sarah Chen</p>
              <p className="text-[10px] text-neutral-500 truncate font-mono tracking-wider uppercase">Super Admin</p>
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
          className="w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-neutral-500 hover:text-primary-300 hover:bg-white/5 transition-colors"
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
