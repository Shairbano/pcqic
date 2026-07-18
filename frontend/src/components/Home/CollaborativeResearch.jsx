import { CheckCircle, Clock, LogIn, ShieldCheck } from 'lucide-react';
import Card from '../ui/Card';
import Heading from '../ui/Heading';
import Text from '../ui/Text';

const steps = [
  {
    icon: CheckCircle,
    title: 'Public information',
    text: 'Visitors can see general totals, active groups, and the listed group heads without logging in.',
  },
  {
    icon: LogIn,
    title: 'Staff access',
    text: 'Employees and admins log in to open dashboards, request group access, view projects, and manage tasks.',
  },
  {
    icon: Clock,
    title: 'Approval workflow',
    text: 'Employee-created groups wait for admin approval. Join requests are handled by each group head.',
  },
  {
    icon: ShieldCheck,
    title: 'Admin control',
    text: 'Admins manage users, roles, credentials, reports, audit logs, and platform-level approvals.',
  },
];

const CollaborativeResearch = () => {
  return (
    <section className="max-w-6xl mx-auto my-16 px-4">
      <div className="mb-8">
        <Text className="text-purple-600 text-xs font-bold uppercase tracking-widest">System workflow</Text>
        <Heading className="text-2xl md:text-3xl font-extrabold text-[var(--pms-bg-surface)] mt-2">
          How records move through PMS
        </Heading>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 cursor-pointer">
        {steps.map(({ icon: Icon, title, text }) => (
          <Card
            key={title}
            hoverable
            className="bg-white border-purple-100 shadow-sm hover:border-purple-300"
          >
            <Card.Body>
              <div className="h-11 w-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                <Icon size={21} className="text-purple-600" />
              </div>
              <Card.Title className="!text-[var(--pms-bg-surface)] mt-4">{title}</Card.Title>
              <Card.Description className="!text-gray-500 mt-2">{text}</Card.Description>
            </Card.Body>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default CollaborativeResearch;