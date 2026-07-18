import { useState, useCallback } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/authContext';
import useCancellableFetch from '../../hooks/useCancellableFetch';
import Table from '../ui/Table';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import Badge from '../ui/Badge';
import ProjectDetail from '../Projects/ProjectDetail';
import { formatDate } from '../../utils/date';
import { FolderOpen, Users } from 'lucide-react';

const ProjectRow = ({ project, onOpen }) => (
  <tr
    onClick={() => onOpen(project)}
    className="border-t border-white/5 bg-[var(--pms-bg-surface-alt)] hover:bg-[var(--pms-bg-hover)] cursor-pointer transition"
  >
    <Table.Td className="text-white font-medium">{project.name}</Table.Td>
    <Table.Td className="text-gray-400">{project.groupId?.name ?? '-'}</Table.Td>
    <Table.Td className="text-gray-400">{project.createdBy?.name ?? '-'}</Table.Td>
    <Table.Td><Badge variant={project.status === 'active' ? 'green' : 'yellow'}>{project.status}</Badge></Table.Td>
    <Table.Td className="text-gray-400 text-xs">{project.deadline ? formatDate(project.deadline) : '-'}</Table.Td>
  </tr>
);

const ProjectTable = ({ list, emptyText, onOpen }) => (
  <Table>
    <Table.Head>
      <Table.Th>Project</Table.Th>
      <Table.Th>Group</Table.Th>
      <Table.Th>Created By</Table.Th>
      <Table.Th>Status</Table.Th>
      <Table.Th>Deadline</Table.Th>
    </Table.Head>
    <Table.Body>
      {list.length === 0 ? (
        <tr><td colSpan={5} className="p-8 text-center text-gray-500">{emptyText}</td></tr>
      ) : list.map(project => <ProjectRow key={project._id} project={project} onOpen={onOpen} />)}
    </Table.Body>
  </Table>
);

const AdminProjects = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null); // { projectId, groupId }

  const fetchProjects = useCallback(
    () => api.get('/admin/projects').then(res => res.data.projects ?? []),
    []
  );
  const { data: projects, loading } = useCancellableFetch(fetchProjects, [], { logErrors: true });

  const openProject = (project) =>
    setSelected({ projectId: project._id, groupId: project.groupId?._id ?? project.groupId });

  if (loading) return <div className="text-center text-purple-400 animate-pulse py-12">Loading projects...</div>;

  if (selected) {
    return (
      <ProjectDetail
        groupId={selected.groupId}
        projectId={selected.projectId}
        onBack={() => setSelected(null)}
        backLabel="Back to Projects"
      />
    );
  }

  const myId = user?.id?.toString();
  const myProjects    = projects.filter(p => (p.createdBy?._id?.toString() ?? p.createdBy?.toString()) === myId);
  const otherProjects = projects.filter(p => (p.createdBy?._id?.toString() ?? p.createdBy?.toString()) !== myId);

  return (
    <div className="space-y-8">
      <div>
        <Heading level={2}>Projects</Heading>
        <Text>{projects.length} project{projects.length !== 1 ? 's' : ''}</Text>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={16} className="text-yellow-400" />
          <Heading level={3}>Projects You Created</Heading>
        </div>
        <ProjectTable list={myProjects} emptyText="You haven't created any projects" onOpen={openProject} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-400" />
          <Heading level={3}>Other Projects</Heading>
        </div>
        <ProjectTable list={otherProjects} emptyText="No other projects found" onOpen={openProject} />
      </div>
    </div>
  );
};

export default AdminProjects;