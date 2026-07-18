import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import useSignOutConfirm from '../hooks/useSignOutConfirm';
import Avatar from './ui/Avatar';
import Text from './ui/Text';
import {
  Home, LogOut, ChevronDown, X, Menu,
  BarChart2, Users, Layers, FolderOpen, FlaskConical,
  Bell, ClipboardList, LockKeyhole, Mail, ScrollText, LayoutDashboard, HelpCircle,
} from 'lucide-react';

const ADMIN_NAV = [
  { id: 'overview',        label: 'Overview',        icon: BarChart2     },
  { id: 'users',           label: 'Users',           icon: Users         },
  { id: 'groups',          label: 'Manage Groups',   icon: Layers        },
  { id: 'projects',        label: 'Projects',        icon: FolderOpen    },
  { id: 'group-approvals', label: 'Group Approvals', icon: FlaskConical  },
  { id: 'invites',         label: 'Invites',         icon: Bell          },
  { id: 'messages',        label: 'Messages',        icon: Mail          },
  { id: 'my-tasks',        label: 'My Tasks',        icon: ClipboardList },
  { id: 'guide',           label: 'Guide & Help',    icon: HelpCircle    },
  { id: 'locked',          label: 'Locked',          icon: LockKeyhole   },
  { id: 'audit',           label: 'Audit Log',       icon: ScrollText    },
];

const EMPLOYEE_NAV = [
  { id: 'overview', label: 'Overview',    icon: LayoutDashboard },
  { id: 'groups',   label: 'My Groups',   icon: Layers          },
  { id: 'tasks',    label: 'My Tasks',    icon: ClipboardList   },
  { id: 'requests', label: 'Invites',     icon: Bell            },
  { id: 'guide',    label: 'Guide & Help', icon: HelpCircle     },
  { id: 'locked',   label: 'Locked',      icon: LockKeyhole     },
];

// ── Shared presentational sidebar ───────────────────────────────────────────
// Used two ways: directly, with explicit props, by Dashboard.jsx (which
// already knows its own navItems/activeTab/onNavClick); and indirectly,
// via the default-exported Sidebar wrapper below, for the standalone
// group/project/task detail pages that need the same sidebar but have no
// Dashboard.jsx parent to supply those props.
//
// `variant`: 'fixed' (default) floats over content — Dashboard.jsx's
// layout adds md:ml-64 to its main content area to compensate. 'static'
// becomes a normal flex sibling on desktop instead — used by the Sidebar
// wrapper below, where the caller's layout is just a plain flex row.
export const DashboardSidebar = ({
  subtitle,
  navItems,        // [{ id, label, icon, badge }]
  activeTab,
  onNavClick,       // (id) => void — caller-specific side effects
  sidebarOpen,
  onCloseSidebar,   // () => void — closes sidebar (mobile backdrop + after nav click)
  user,
  onSignOut,
  avatarGradient = 'from-purple-500 to-yellow-400',
  variant = 'fixed',
}) => {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const isStatic = variant === 'static';

  const asideClass = isStatic
    ? `fixed inset-y-0 left-0 z-50 w-64 bg-[var(--pms-bg-surface)] border-r border-purple-900/40 flex flex-col
        min-h-screen transform transition-transform duration-200
        md:translate-x-0 md:static md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
    : `fixed inset-y-0 left-0 z-40 w-64 h-screen bg-[var(--pms-bg-surface)] border-r border-purple-900/40 flex flex-col shadow-xl
        transform transition-transform duration-200
        md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`;

  return (
    <>
      <aside className={asideClass}>
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold tracking-widest text-white">
              PM<span className="text-purple-400">S</span>
            </span>
            <Text size="text-xs" color="text-gray-500" className="mt-0.5">{subtitle}</Text>
          </div>
          {isStatic && (
            <button onClick={onCloseSidebar} className="md:hidden text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button onClick={() => navigate('/')}
            className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 hover:translate-x-1 transition cursor-pointer">
            <Home size={16} /> Home
          </button>
          <div className="my-2 border-t border-white/5" />
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id}
                onClick={() => {
                  onNavClick(item.id);
                  onCloseSidebar();
                }}
                className={`relative w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition font-medium cursor-pointer hover:translate-x-1 ${
                  activeTab === item.id
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}>
                <Icon size={16} />
                {item.label}
                {item.badge > 0 && (
                  <span className="absolute right-3 h-5 w-5 bg-yellow-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 relative">
          {showLogout && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-[var(--pms-bg-dropdown)] border border-purple-900/40 rounded-xl shadow-lg overflow-hidden">
              <button onClick={onSignOut}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition flex items-center gap-2 cursor-pointer">
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
          <button onClick={() => setShowLogout(p => !p)}
            className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 transition cursor-pointer">
            <Avatar name={user?.name} size="lg" gradient={avatarGradient} />
            <div className="text-left flex-1 min-w-0">
              <Text size="text-sm" weight="font-bold" color="text-white" className="leading-none truncate">{user?.name}</Text>
              <Text size="text-xs" color="text-purple-400" className="uppercase tracking-wider mt-0.5">{user?.role}</Text>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${showLogout ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className={`fixed inset-0 ${isStatic ? 'z-40' : 'z-30'} bg-black/50 md:hidden`} onClick={onCloseSidebar} />
      )}
    </>
  );
};

// ── Standalone sidebar ──────────────────────────────────────────────────────
// For pages outside Dashboard.jsx (group/project/task detail pages) — same
// visual sidebar, rendered via DashboardSidebar above (variant="static").
// This part supplies what those pages don't have: NAV computed from role,
// and self-navigation by URL state when no onSelectTab is given.
const Sidebar = ({ activeTab, onSelectTab, counts = {} }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleLogout = useSignOutConfirm();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin       = user?.role === 'admin';
  const NAV           = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;
  const dashboardPath = isAdmin ? '/admin-dashboard' : '/user-dashboard';
  const panelLabel    = isAdmin ? 'Admin Panel' : 'My Workspace';

  const handleSelect = (id) => {
    if (onSelectTab) onSelectTab(id);
    else navigate(dashboardPath, { state: { tab: id } });
    setMobileOpen(false);
  };

  const navItems = NAV.map(item => ({ ...item, badge: counts[item.id] ?? 0 }));

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--pms-bg-surface)] border border-purple-900/40 text-gray-300 hover:text-white transition"
      >
        <Menu size={18} />
      </button>

      <DashboardSidebar
        variant="static"
        subtitle={panelLabel}
        navItems={navItems}
        activeTab={activeTab}
        onNavClick={handleSelect}
        sidebarOpen={mobileOpen}
        onCloseSidebar={() => setMobileOpen(false)}
        user={user}
        onSignOut={handleLogout}
      />
    </>
  );
};

export default Sidebar;