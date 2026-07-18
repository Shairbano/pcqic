import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import useSignOutConfirm from '../hooks/useSignOutConfirm';
import api from '../utils/api';

// Admin-only sub-views
import Reports          from '../components/Admin/Reports';
import UserManagement   from '../components/Admin/UserManagement';
import GroupApprovals   from '../components/Admin/GroupApprovals';
import AuditLog         from '../components/Admin/AuditLog';
import AdminGroups      from '../components/Admin/AdminGroups';
import AdminMessages    from '../components/Admin/AdminMessages';
import AdminProjects    from '../components/Admin/AdminProjects';
import AdminMyTasks     from '../components/Admin/AdminMyTasks';
import AdminInvites     from '../components/Admin/AdminInvites';
import AdminGuideHelp   from '../components/Admin/AdminGuideHelp';

// User-only sub-views
import { taskService } from '../services/projectTaskService';
import notificationService from '../services/NotificationService';
import StatusBadge from '../components/ui/StatusBadge';
import GroupDetailPanel from '../components/Groups/GroupDetail';
import CreateGroupModal from '../components/Groups/CreateGroupModel';
import GuideHelp from '../components/GuideHelp';
import { CARD_COLORS } from '../utils/cardColors';
import { formatDate } from '../utils/date';

// Shared by both
import ArchivedItems    from '../components/ArchivedItems';
import { DashboardSidebar } from '../components/Sidebar';
import Button            from '../components/ui/Button';
import Heading           from '../components/ui/Heading';
import Text              from '../components/ui/Text';

import {
  BarChart2, Users, FlaskConical,
  ScrollText, Menu, Layers, Bell, ClipboardList,
  LockKeyhole, Mail, FolderOpen, HelpCircle,
  LayoutDashboard, Plus, ArrowLeft, Clock, UserCheck,
} from 'lucide-react';

// ── Dashboard ──────────────────────────────────────────────────────────────
// Single entry point for both roles. App.jsx's routes already gate access
// via RoleBasedRoutes (admins only reach /admin-dashboard, employees only
// reach /user-dashboard), so this just picks the matching view for
// whichever role actually lands here.
const Dashboard = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboardView /> : <UserDashboardView />;
};

// ── Admin view (identical to the former pages/AdminDashboard.jsx) ──────────
const ADMIN_NAV = [
  { id: 'overview',        label: 'Overview',        icon: BarChart2    },
  { id: 'users',           label: 'Users',           icon: Users        },
  { id: 'groups',          label: 'Manage Groups',   icon: Layers       },
  { id: 'projects',        label: 'Projects',        icon: FolderOpen   },
  { id: 'group-approvals', label: 'Group Approvals', icon: FlaskConical },
  { id: 'invites',         label: 'Invites',         icon: Bell         },
  { id: 'messages',        label: 'Messages',        icon: Mail         },
  { id: 'my-tasks',        label: 'My Tasks',        icon: ClipboardList },
  { id: 'guide',           label: 'Guide & Help',    icon: HelpCircle   },
  { id: 'locked',          label: 'Locked',          icon: LockKeyhole  },
  { id: 'audit',           label: 'Audit Log',       icon: ScrollText   },
];

const AdminDashboardView = () => {
  const { user } = useAuth();
  const handleSignOut = useSignOutConfirm();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);
  const [approvalCount, setApprovalCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [taskNotifCount, setTaskNotifCount] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab ?? 'overview');

  // Sync activeTab with location.state.tab WITHOUT using an effect.
  // This follows the React-recommended "adjusting state during render" pattern
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // instead of calling setState synchronously inside a useEffect body.
  const [prevLocationTab, setPrevLocationTab] = useState(location.state?.tab);
  if (location.state?.tab !== prevLocationTab) {
    setPrevLocationTab(location.state?.tab);
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }

  useEffect(() => {
    Promise.allSettled([
      api.get('/group?type=requests'),
      api.get('/group?type=join_requests'),
      api.get('/admin/groups?status=pending'),
      api.get('/notifications'),
    ]).then(([inviteRes, joinRes, approvalRes, notifRes]) => {
      const invites = inviteRes.status === 'fulfilled' ? (inviteRes.value.data.groups ?? []).length : 0;
      const joins = joinRes.status === 'fulfilled'
        ? (joinRes.value.data.groups ?? []).reduce((sum, group) => sum + (group.pendingMembers?.length ?? 0), 0)
        : 0;
      setInviteCount(invites + joins);
      setApprovalCount(approvalRes.status === 'fulfilled' ? (approvalRes.value.data.groups ?? []).length : 0);
      setMessageCount(notifRes.status === 'fulfilled'
        ? (notifRes.value.data.notifications ?? []).filter(n => ['admin_contact', 'unlock_request'].includes(n.type) && !n.read).length
        : 0);
      setTaskNotifCount(notifRes.status === 'fulfilled'
        ? (notifRes.value.data.notifications ?? []).filter(n => n.type === 'task_assigned' && !n.read).length
        : 0);
    }).catch(console.error);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':        return <Reports key={resetKey} onNavigate={setActiveTab} />;
      case 'users':           return <UserManagement key={resetKey} />;
      case 'groups':          return <AdminGroups key={resetKey} />;
      case 'projects':        return <AdminProjects key={resetKey} />;
      case 'group-approvals': return <GroupApprovals key={resetKey} onCountChange={setApprovalCount} />;
      case 'invites':         return <AdminInvites key={resetKey} />;
      case 'messages':        return <AdminMessages key={resetKey} onReadStateChange={setMessageCount} />;
      case 'my-tasks':        return <AdminMyTasks key={resetKey} />;
      case 'guide':           return <AdminGuideHelp key={resetKey} />;
      case 'locked':          return <ArchivedItems key={resetKey} />;
      case 'audit':           return <AuditLog key={resetKey} />;
      default:                return <Reports key={resetKey} onNavigate={setActiveTab} />;
    }
  };

  const ActiveIcon = ADMIN_NAV.find(n => n.id === activeTab)?.icon ?? BarChart2;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--pms-bg-void)]">

      {/* ── Purple Sidebar ── */}
      <DashboardSidebar
        subtitle="Admin Panel"
        navItems={ADMIN_NAV.map(item => ({
          ...item,
          badge:
            item.id === 'invites' ? inviteCount :
            item.id === 'group-approvals' ? approvalCount :
            item.id === 'messages' ? messageCount :
            item.id === 'my-tasks' ? taskNotifCount :
            0,
        }))}
        activeTab={activeTab}
        onNavClick={(id) => {
          setActiveTab(id);
          setResetKey(k => k + 1);
          if (id === 'my-tasks' && taskNotifCount > 0) {
            setTaskNotifCount(0);
            notificationService.markAllRead(['task_assigned']).catch(console.error);
          }
        }}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* ── Dark Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* Top bar — dark */}
        <header className="sticky top-0 z-20 bg-[var(--pms-bg-surface)] border-b border-purple-900/40 px-6 py-4 flex items-center gap-4 shadow-lg">
          <Button variant="bare" size="none" rounded="none" weight="" icon={Menu} iconSize={20}
            onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-400 hover:text-white" />
          <div className="flex-1">
            <Heading level={1} size="text-lg" className="flex items-center gap-2">
              <ActiveIcon size={18} className="text-purple-400" />
              {ADMIN_NAV.find(n => n.id === activeTab)?.label}
            </Heading>
          </div>
          <div className="flex items-center gap-3">
            {inviteCount > 0 && (
              <Button variant="warningPill" size="sm" rounded="full" weight=""
                onClick={() => setActiveTab('invites')}>
                <span className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-xs text-yellow-400 font-medium">{inviteCount} invite{inviteCount !== 1 ? 's' : ''}</span>
              </Button>
            )}
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              System Online
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// ── User view (identical to the former pages/UserDashboard.jsx) ────────────
const UserDashboardView = () => {
  const { user } = useAuth();
  const handleSignOut = useSignOutConfirm();
  const navigate  = useNavigate();
  const { groupId: urlGroupId } = useParams();
  const location = useLocation();
  const initialTab = urlGroupId ? 'groups' : (location.state?.tab ?? 'overview');

  const [dashboardData, setDashboardData] = useState({
    myGroups: [], myPendingGroups: [], memberGroups: [],
    myTasks: [], requests: [], joinRequests: [], notifications: [],
  });

  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState(initialTab);
  const [selectedGroup, setSelectedGroup] = useState(urlGroupId || null);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [showCreate,    setShowCreate]    = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [grpRes, pendingRes, memRes, taskRes, reqRes, joinReqRes, notifRes] = await Promise.allSettled([
        api.get('/group?type=my_groups'),
        api.get('/group?type=my_pending_groups'),
        api.get('/group?type=member_groups'),
        taskService.getMyTasks(),
        api.get('/group?type=requests'),
        api.get('/group?type=join_requests'),
        api.get('/notifications'),
      ]);

      setDashboardData({
        myGroups:        grpRes.status     === 'fulfilled' ? (grpRes.value.data.groups     ?? []) : [],
        myPendingGroups: pendingRes.status === 'fulfilled' ? (pendingRes.value.data.groups ?? []) : [],
        memberGroups:    memRes.status     === 'fulfilled' ? (memRes.value.data.groups     ?? []) : [],
        myTasks:         taskRes.status    === 'fulfilled' ? (taskRes.value.data.tasks      ?? []) : [],
        requests:        reqRes.status     === 'fulfilled' ? (reqRes.value.data.groups      ?? []) : [],
        joinRequests:    joinReqRes.status === 'fulfilled' ? (joinReqRes.value.data.groups  ?? []) : [],
        notifications:   notifRes.status   === 'fulfilled' ? (notifRes.value.data.notifications ?? []) : [],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => { await fetchAll(); })();
  }, [fetchAll]);

  const markNotificationRead = async (id) => {
    setDashboardData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n._id === id ? { ...n, read: true } : n),
    }));
    try {
      await notificationService.markRead(id);
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsRead = async () => {
    setDashboardData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
    }));
    try {
      await notificationService.markAllRead();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRespondToInvite = async (groupId, action) => {
    let reason = '';
    if (action === 'reject') reason = window.prompt('Reason for declining (optional):') ?? '';
    try {
      await api.patch(`/group/${groupId}/respond`, { action, reason });
      setDashboardData(prev => ({ ...prev, requests: prev.requests.filter(g => g._id !== groupId) }));
      if (action === 'accept') {
        const res = await api.get('/group?type=member_groups');
        setDashboardData(prev => ({ ...prev, memberGroups: res.data.groups ?? [] }));
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const handleRespondToJoinRequest = async (groupId, memberId, action) => {
    let reason = '';
    if (action === 'reject') reason = window.prompt('Reason for declining (optional):') ?? '';
    try {
      await api.patch(`/group/${groupId}/members/${memberId}/respond`, { action, reason });
      setDashboardData(prev => ({
        ...prev,
        joinRequests: prev.joinRequests
          .map(group => ({
            ...group,
            pendingMembers: (group.pendingMembers || []).filter(member => member._id !== memberId),
          }))
          .filter(group => (group.pendingMembers || []).length > 0),
      }));
      if (action === 'accept') {
        const res = await api.get('/group?type=my_groups');
        setDashboardData(prev => ({ ...prev, myGroups: res.data.groups ?? [] }));
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const { myGroups, myPendingGroups, memberGroups, myTasks, requests, joinRequests, notifications } = dashboardData;

  const pendingTasks   = myTasks.filter(t => t.status === 'pending');
  const completedTasks = myTasks.filter(t => t.status === 'completed');
  const allActiveGroups = [...myGroups, ...memberGroups];
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const taskNotifCount = notifications.filter(n => n.type === 'task_assigned' && !n.read).length;
  const joinRequestCount = joinRequests.reduce((sum, group) => sum + (group.pendingMembers?.length ?? 0), 0);
  const requestCount = requests.length + joinRequestCount;

  const NAV = [
    { id: 'overview', label: 'Overview',    icon: LayoutDashboard },
    { id: 'groups',   label: 'My Groups',   icon: Layers          },
    { id: 'tasks',    label: 'My Tasks',    icon: ClipboardList   },
    { id: 'requests', label: 'Invites',     icon: Bell            },
    { id: 'guide',    label: 'Guide & Help', icon: HelpCircle     },
    { id: 'locked',   label: 'Locked',      icon: LockKeyhole     },
  ];

  const openGroup         = (id) => { setSelectedGroup(id); setActiveTab('groups'); };
  const goBackToGroupList = ()   => setSelectedGroup(null);
  const ActiveIcon = NAV.find(n => n.id === activeTab)?.icon ?? LayoutDashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--pms-bg-void)]">

      {/* ── Purple Sidebar ── */}
      <DashboardSidebar
        subtitle="My Workspace"
        navItems={NAV.map(item => ({
          ...item,
          badge: item.id === 'requests' ? requestCount : item.id === 'tasks' ? taskNotifCount : 0,
        }))}
        activeTab={activeTab}
        onNavClick={(id) => {
          setActiveTab(id);
          setSelectedGroup(null);
          if (id === 'tasks' && taskNotifCount > 0) {
            setDashboardData(prev => ({
              ...prev,
              notifications: prev.notifications.map(n => n.type === 'task_assigned' ? { ...n, read: true } : n),
            }));
            notificationService.markAllRead(['task_assigned']).catch(console.error);
          }
        }}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        user={user}
        onSignOut={handleSignOut}
      />

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">

        {/* Top bar — same shell/spacing as Admin Dashboard's header */}
        <header className="sticky top-0 z-20 bg-[var(--pms-bg-surface)] border-b border-purple-900/40 px-6 py-4 flex items-center gap-4 shadow-lg">
          <Button variant="bare" size="none" rounded="none" weight="" icon={Menu} iconSize={20}
            onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-400 hover:text-white" />
          <div className="flex-1">
            <Heading level={1} size="text-lg" className="flex items-center gap-2">
              <ActiveIcon size={18} className="text-purple-400" />
              {NAV.find(n => n.id === activeTab)?.label}
            </Heading>
            <Text size="text-xs" color="text-gray-400" className="mt-0.5">Welcome back, {user?.name}</Text>
          </div>
          <div className="flex items-center gap-3">
            {requestCount > 0 && (
              <Button variant="warningPill" size="sm" rounded="full" weight=""
                onClick={() => setActiveTab('requests')}>
                <span className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-xs text-yellow-400 font-medium">{requestCount} request{requestCount !== 1 ? 's' : ''}</span>
              </Button>
            )}
            {unreadNotifs > 0 && (
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/15 border border-purple-500/30 rounded-full text-xs text-purple-300 hover:bg-purple-500/25 transition cursor-pointer"
              >
                <Bell size={12} /> {unreadNotifs} new
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              System Online
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[var(--pms-bg-surface)] rounded-2xl animate-pulse border border-purple-900/40" />)}
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'My Groups',       value: myGroups.length,       color: 'border-purple-500', tab: 'groups' },
                      { label: 'Member Groups',   value: memberGroups.length,   color: 'border-blue-500',   tab: 'groups' },
                      { label: 'Pending Tasks',   value: pendingTasks.length,   color: 'border-yellow-500', tab: 'tasks'  },
                      { label: 'Completed Tasks', value: completedTasks.length, color: 'border-green-500',  tab: 'tasks'  },
                    ].map((s, i) => (
                      <div
                        key={i}
                        onClick={() => setActiveTab(s.tab)}
                        className={`p-5 bg-[var(--pms-bg-surface)] rounded-2xl border-l-4 ${s.color} border border-purple-900/40 shadow-lg cursor-pointer hover:-translate-y-0.5 hover:border-purple-500/60 transition-all duration-200`}
                      >
                        <Text size="text-xs" color="text-gray-400" className="uppercase tracking-wider">{s.label}</Text>
                        <Text size="text-3xl" weight="font-bold" color="text-white" className="mt-2">{s.value}</Text>
                      </div>
                    ))}
                  </div>

                  {myTasks.length > 0 && (
                    <div>
                      <Heading level={3} size="" weight="font-semibold" className="mb-3">Recent Tasks</Heading>
                      <div className="space-y-2">
                        {myTasks.slice(0, 5).map(t => (
                          <div key={t._id}
                            onClick={() => navigate(`/groups/${t.groupId?._id ?? t.groupId}/projects/${t.projectId?._id ?? t.projectId}/tasks/${t._id}`)}
                            className="flex items-center justify-between bg-[var(--pms-bg-surface)] rounded-xl p-4 border border-purple-900/40 hover:border-purple-500/60 hover:shadow-sm transition cursor-pointer">
                            <div>
                              <Text size="text-sm" weight="font-medium" color="text-white">{t.title}</Text>
                              <Text size="text-xs" color="text-slate-400">{t.projectId?.name ?? '—'} · {t.groupId?.name ?? '—'}</Text>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <Text size="text-xs" color="text-gray-500">{t.progress ?? 0}%</Text>
                                <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden mt-1">
                                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${t.progress ?? 0}%` }} />
                                </div>
                              </div>
                              <StatusBadge status={t.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {notifications.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Heading level={3} size="" weight="font-semibold">Recent Notifications</Heading>
                        {unreadNotifs > 0 && (
                          <button
                            onClick={markAllNotificationsRead}
                            className="text-xs text-purple-300 hover:text-purple-200 transition cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {notifications.slice(0, 5).map(n => (
                          <div key={n._id}
                            onClick={() => !n.read && markNotificationRead(n._id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-500/50 ${n.read ? 'border-white/10 bg-[var(--pms-bg-deep-2)]' : 'border-purple-500/30 bg-purple-500/10'}`}>
                            <Text size="text-sm" color="text-gray-200">{n.message}</Text>
                            <Text size="text-xs" color="text-gray-500" className="mt-1">{formatDate(n.createdAt)}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* GROUPS LIST */}
              {activeTab === 'groups' && !selectedGroup && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Heading level={2} size="text-xl">My Groups</Heading>
                    <Button variant="primaryLift" size="md" rounded="xl" icon={Plus} iconSize={15}
                      onClick={() => setShowCreate(true)}>
                      New Group
                    </Button>
                  </div>

                  {myPendingGroups.length > 0 && (
                    <div>
                      <Heading level={3} size="text-sm" weight="font-semibold" color="text-yellow-600" className="uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Clock size={14} /> Pending Admin Approval
                      </Heading>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myPendingGroups.map(g => (
                          <div key={g._id} className="bg-yellow-500/10 rounded-2xl border border-yellow-500/30 p-5">
                            <div className="flex justify-between items-start mb-2">
                              <Heading level={4} size="" weight="font-semibold" className="leading-snug">{g.name}</Heading>
                              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">pending</span>
                            </div>
                            <Text size="text-xs" color="text-gray-400" className="line-clamp-2">{g.description || 'No description.'}</Text>
                            <Text size="text-xs" color="text-yellow-300" className="mt-3 flex items-center gap-1"><Clock size={11} /> Waiting for admin to approve</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allActiveGroups.length === 0 && myPendingGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Layers size={48} className="text-gray-600 mb-4" />
                      <Heading level={3} size="text-lg" weight="font-semibold" color="text-gray-400" className="mb-2">No groups yet</Heading>
                      <Text size="text-sm" color="text-gray-500">Create a group or wait to be invited.</Text>
                    </div>
                  ) : (
                    <>
                      {myGroups.length > 0 && (
                        <div>
                          <Heading level={3} size="text-sm" weight="font-semibold" color="text-gray-400" className="uppercase tracking-wide mb-3 flex items-center gap-2">
                            <UserCheck size={14} /> Groups I Lead
                          </Heading>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {myGroups.map((g, idx) => <GroupCard key={g._id} group={g} idx={idx} isHead onClick={() => openGroup(g._id)} />)}
                          </div>
                        </div>
                      )}
                      {memberGroups.length > 0 && (
                        <div>
                          <Heading level={3} size="text-sm" weight="font-semibold" color="text-gray-400" className="uppercase tracking-wide mb-3">Groups I'm a Member Of</Heading>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {memberGroups.map((g, idx) => <GroupCard key={g._id} group={g} idx={idx} onClick={() => openGroup(g._id)} />)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* GROUP DETAIL */}
              {activeTab === 'groups' && selectedGroup && (
                <div>
                  <Button variant="linkPurple" size="none" rounded="none" weight="font-medium"
                    icon={ArrowLeft} iconSize={15} onClick={goBackToGroupList} className="text-sm mb-6">
                    Back to Groups
                  </Button>
                  <GroupDetailPanel groupId={selectedGroup} onDeleted={goBackToGroupList} />
                </div>
              )}

              {/* TASKS */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <Heading level={2} size="text-xl">My Tasks</Heading>
                  {myTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <ClipboardList size={48} className="text-gray-600 mb-4" />
                      <Heading level={3} size="text-lg" weight="font-semibold" color="text-gray-400" className="mb-2">No tasks assigned</Heading>
                      <Text size="text-sm" color="text-gray-500">Tasks assigned to you will appear here.</Text>
                    </div>
                  ) : (
                    myTasks.map(t => (
                      <div key={t._id}
                        onClick={() => navigate(`/groups/${t.groupId?._id ?? t.groupId}/projects/${t.projectId?._id ?? t.projectId}/tasks/${t._id}`)}
                        className="bg-[var(--pms-bg-surface)] rounded-2xl border border-purple-900/40 hover:border-purple-500/60 hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Heading level={4} size="" weight="font-semibold">{t.title}</Heading>
                            <Text size="text-xs" color="text-slate-400" className="mt-0.5">{t.projectId?.name ?? '—'} · {t.groupId?.name ?? '—'}</Text>
                          </div>
                          <StatusBadge status={t.status} />
                        </div>
                        <Text size="text-xs" color="text-gray-400" className="mb-3 line-clamp-2">{t.description ?? 'No description.'}</Text>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progress</span><span>{t.progress ?? 0}%</span></div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-400 rounded-full" style={{ width: `${t.progress ?? 0}%` }} />
                            </div>
                          </div>
                          {t.deadline && <Text size="text-xs" color="text-gray-500" className="whitespace-nowrap">Due {formatDate(t.deadline)}</Text>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* INVITES */}
              {activeTab === 'requests' && (
                <div className="space-y-4">
                  <Heading level={2} size="text-xl">Pending Invites</Heading>
                  {requests.length === 0 && joinRequestCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Bell size={48} className="text-gray-600 mb-4" />
                      <Heading level={3} size="text-lg" weight="font-semibold" color="text-gray-400" className="mb-2">No pending invites</Heading>
                      <Text size="text-sm" color="text-gray-500">Group invitations and join requests will appear here.</Text>
                    </div>
                  ) : (
                    <>
                      {joinRequests.map(group => (
                        <div key={group._id} className="bg-[var(--pms-bg-surface)] rounded-2xl border border-purple-500/30 shadow-sm p-5">
                          <Heading level={4} size="" weight="font-semibold">{group.name}</Heading>
                          <Text size="text-xs" color="text-gray-400" className="mt-0.5 mb-4">Join requests for this group</Text>
                          <div className="space-y-3">
                            {(group.pendingMembers || []).map(member => (
                              <div key={member._id} className="rounded-xl border border-white/10 bg-[var(--pms-bg-inset)] p-4">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <div>
                                    <Text size="text-sm" weight="font-semibold" color="text-white">{member.userId?.name ?? 'Member'}</Text>
                                    <Text size="text-xs" color="text-gray-400">{member.userId?.email}</Text>
                                  </div>
                                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">join request</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="successTint" size="md" rounded="xl" weight="font-medium" className="flex-1"
                                    onClick={() => handleRespondToJoinRequest(group._id, member._id, 'accept')}>Accept</Button>
                                  <Button variant="dangerTint" size="md" rounded="xl" weight="font-medium" className="flex-1"
                                    onClick={() => handleRespondToJoinRequest(group._id, member._id, 'reject')}>Decline</Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {requests.map(g => (
                        <div key={g._id} className="bg-[var(--pms-bg-surface)] rounded-2xl border border-yellow-500/30 shadow-sm p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <Heading level={4} size="" weight="font-semibold">{g.name}</Heading>
                              <Text size="text-xs" color="text-gray-500" className="mt-0.5">Invited by {g.createdBy?.name ?? '—'}</Text>
                            </div>
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">invited</span>
                          </div>
                          <Text size="text-xs" color="text-gray-400" className="mb-4 line-clamp-2">{g.description || 'No description.'}</Text>
                          <div className="flex gap-2">
                            <Button variant="successTint" size="md" rounded="xl" weight="font-medium" className="flex-1"
                              onClick={() => handleRespondToInvite(g._id, 'accept')}>Accept</Button>
                            <Button variant="dangerTint" size="md" rounded="xl" weight="font-medium" className="flex-1"
                              onClick={() => handleRespondToInvite(g._id, 'reject')}>Decline</Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* GUIDE & HELP */}
              {activeTab === 'guide' && <GuideHelp />}

              {activeTab === 'locked' && <ArchivedItems tone="light" />}
            </>
          )}
        </main>
      </div>

      <CreateGroupModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { setShowCreate(false); fetchAll(); }}
      />
    </div>
  );
};

// Used only by UserDashboardView, for rendering group cards in "My Groups".
const GroupCard = ({ group, idx = 0, onClick, isHead = false }) => {
  const color       = CARD_COLORS[idx % CARD_COLORS.length];
  const memberCount = (group.members || []).filter(m => m.status === 'accepted').length;
  const headName    = group.groupHead?.name ?? group.createdBy?.name ?? '—';

  return (
    <div
      onClick={onClick}
      className="rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 transition-all duration-200 shadow-lg"
      style={{ background: color.bg, border: `1.5px solid ${color.border}` }}
    >
      {group.coverPhoto ? (
        <div className="h-28 overflow-hidden flex-shrink-0">
          <img
            src={group.coverPhoto}
            alt={group.name}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${group.coverPosition?.x ?? 50}% ${group.coverPosition?.y ?? 50}%` }}
          />
        </div>
      ) : (
        <div style={{ height: '5px', background: color.bar, flexShrink: 0 }} />
      )}

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Heading level={3} size="text-base" className="leading-snug flex-1 pr-2 truncate">{group.name}</Heading>
          <div className="flex items-center gap-2 shrink-0">
            {isHead && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                Head
              </span>
            )}
            <StatusBadge status={group.status} />
          </div>
        </div>

        <Text size="text-xs" color="text-gray-400" className="line-clamp-2 mb-3 flex-1">
          {group.description || 'No description.'}
        </Text>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <UserCheck size={12} /> {memberCount} member{memberCount !== 1 ? 's' : ''}
          </span>
          {isHead ? (
            <span className="text-[10px] uppercase tracking-[0.18em] text-purple-300">View</span>
          ) : (
            <span>
              Head: <span className="font-semibold" style={{ color: color.bar }}>{headName}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;