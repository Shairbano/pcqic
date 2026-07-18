import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TaskDetail from '../components/Tasks/TaskDetail';

const TaskPage = () => {
  const { groupId, projectId, taskId } = useParams();

  return (
    <div className="flex min-h-screen bg-[var(--pms-bg-void)] text-white">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 md:p-8 overflow-auto bg-[var(--pms-bg-void)]">
        {/* TaskDetail reads access_level from backend task response.
            accessLevel=0 is a safe fallback only if backend doesn't return it. */}
        <TaskDetail
          groupId={groupId}
          projectId={projectId}
          taskId={taskId}
          accessLevel={0}
        />
      </main>
    </div>
  );
};

export default TaskPage;