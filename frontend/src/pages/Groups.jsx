import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { getAccessLevel } from '../utils/permissions';
import Sidebar from '../components/Sidebar';
import GroupList from '../components/Groups/GroupList';
import GroupDetail from '../components/Groups/GroupDetail';
import Button from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

const GroupPage = () => {
  const { id }    = useParams();
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const level     = getAccessLevel(user);
  const [hasNestedProject, setHasNestedProject] = useState(false);

  
  const validId = id && id !== 'undefined' && id !== 'null' && /^[a-f\d]{24}$/i.test(id) ? id : null;
  const dashboardPath = user?.role === 'admin' ? '/admin-dashboard' : '/user-dashboard';
  const goToMyGroups  = () => navigate(dashboardPath, { state: { tab: 'groups' } });

  return (
    <div className="flex min-h-screen bg-[var(--pms-bg-void)] text-white">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 md:p-8 overflow-auto">
        {validId ? (
          <div>
            {!hasNestedProject && (
              <Button
                variant="linkPurple"
                size="none"
                rounded="none"
                weight="font-medium"
                icon={ArrowLeft}
                iconSize={15}
                onClick={goToMyGroups}
                className="text-sm mb-6"
              >
                Back to Groups
              </Button>
            )}
            {/* groupId is the correct prop name GroupDetail expects */}
            <GroupDetail groupId={validId} onDeleted={goToMyGroups} onNestedChange={setHasNestedProject} />
          </div>
        ) : (
          <GroupList accessLevel={level} />
        )}
      </main>
    </div>
  );
};

export default GroupPage;