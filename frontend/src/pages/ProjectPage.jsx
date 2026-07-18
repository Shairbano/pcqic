// src/pages/ProjectPage.jsx
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ProjectDetail from '../components/Projects/ProjectDetail';

const ProjectPage = () => {
  const { groupId, projectId } = useParams();

  return (
    // bg-[var(--pms-bg-void)] on the wrapper AND on <main> prevents white bleed-through
    <div className="flex min-h-screen bg-[var(--pms-bg-void)] text-white">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 md:p-8 overflow-auto bg-[var(--pms-bg-void)]">
        <ProjectDetail groupId={groupId} projectId={projectId} />
      </main>
    </div>
  );
};

export default ProjectPage;