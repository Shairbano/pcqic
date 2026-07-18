import { useState } from 'react';
import { useAuth } from '../../context/authContext';
import { Layers, FolderOpen, ClipboardList, Users } from 'lucide-react';
import about from '../../assets/images/about.avif';
import Button from '../ui/Button';
import Card from '../ui/Card';
import TextLink from '../ui/TextLink';
import Heading from '../ui/Heading';
import Text from '../ui/Text';

const tabs = {
  Groups: {
    icon: Layers,
    text: 'Active groups are visible in the public directory. Members can request access after login, while group heads manage members and join requests.',
    action: { label: 'Open Groups', to: '/groups' },
  },
  Projects: {
    icon: FolderOpen,
    text: 'Projects are organized inside approved groups. Project details, files, deadlines, and task lists are available to authorized members.',
    action: { label: 'Login for Projects', to: '/login' },
  },
  Tasks: {
    icon: ClipboardList,
    text: 'Tasks track assigned work, progress, deadlines, history, and attachments. Assigned users can update their work from the dashboard.',
    action: { label: 'Open Dashboard', to: '/login' },
  },
  Users: {
    icon: Users,
    text: 'Admins manage user accounts, roles, credentials, and unique staff IDs. Public pages only show general totals and admin contact options.',
    action: { label: 'Staff Login', to: '/login' },
  },
};

const Mission = () => {
  const [activeTab, setActiveTab] = useState('Groups');
  const { user } = useAuth();
  const active = tabs[activeTab];
  const Icon = active.icon;
  const dashboardPath = user?.role === 'admin' ? '/admin-dashboard' : '/user-dashboard';

  const getAction = (tab) => {
    if (!user) return tabs[tab].action;
    if (tab === 'Projects') return { label: 'Open Projects', to: dashboardPath, state: { tab: user.role === 'admin' ? 'projects' : 'groups' } };
    if (tab === 'Tasks') return { label: 'Open Tasks', to: dashboardPath, state: { tab: user.role === 'admin' ? 'my-tasks' : 'tasks' } };
    if (tab === 'Users') return user.role === 'admin'
      ? { label: 'Open Users', to: dashboardPath, state: { tab: 'users' } }
      : { label: 'Open Users', to: dashboardPath, state: { tab: 'overview' } };
    return { label: 'Open Groups', to: dashboardPath, state: { tab: 'groups' } };
  };

  return (
    <section className="max-w-6xl mx-auto my-14 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] bg-[var(--pms-bg-deep-5)] rounded-2xl overflow-hidden border border-[var(--pms-border)] shadow-xl">
        <div className="min-h-[300px]">
          <img
            src={about}
            alt="PMS records"
            className="w-full h-full object-cover grayscale-[15%]"
          />
        </div>

        <div className="p-7 md:p-10 bg-[var(--pms-bg-header)]">
          <Text className="text-purple-300 text-xs font-bold uppercase tracking-widest">Information areas</Text>
          <Heading className="text-2xl md:text-3xl font-bold mt-2 text-white">
            What this platform tracks
          </Heading>

          <div className="flex flex-wrap gap-3 mt-6 ">
            {Object.keys(tabs).map((tab) => {
              const TabIcon = tabs[tab].icon;
              return (
                <Button
                  key={tab}
                  type="button"
                  variant={activeTab === tab ? 'primary' : 'secondary'}
                  icon={TabIcon}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </Button>
              );
            })}
          </div>

          <Card hoverable className="mt-8 bg-[var(--pms-bg-modal)] border-white/10">
            <Card.Body>
              <Icon size={28} className="text-purple-300" />
              <Card.Title className="text-lg mt-3">{activeTab}</Card.Title>
              <Card.Description className="mt-2">{active.text}</Card.Description>
              <TextLink
                to={getAction(activeTab).to}
                state={getAction(activeTab).state}
                className="mt-5"
              >
                {getAction(activeTab).label}
              </TextLink>
            </Card.Body>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Mission;