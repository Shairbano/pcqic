import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services/projectTaskService';
import useCancellableFetch from '../../hooks/useCancellableFetch';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import CreateProjectModal from './CreateProjectModel';
import { formatDate } from '../../utils/date';
import { FolderOpen, Plus, Trash2, Calendar, User } from 'lucide-react';

const ProjectList = ({ groupId, accessLevel, onOpenProject }) => {
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const isGroupHead = accessLevel === 1;

  const fetchProjects = useCallback(
    () => projectService.getByGroup(groupId).then(r => r.data.projects ?? r.data ?? []),
    [groupId]
  );
  const {
    data: projects, setData: setProjects, error, loading, reload: load,
  } = useCancellableFetch(fetchProjects, [groupId], { errorMessage: 'Could not load projects.' });

  const handleDelete = async (e, projectId, projectName) => {
    e.stopPropagation();
    if (!window.confirm(`Move project "${projectName}" to the locked folder?`)) return;
    try {
      await projectService.delete(groupId, projectId);
      setProjects(prev => prev.filter(p => p._id !== projectId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to lock project');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <Heading level={2} size="text-lg" className="flex items-center gap-2">
          <FolderOpen size={18} className="text-purple-400" /> Projects
        </Heading>
        {/* Only group head can create projects */}
        {isGroupHead && (
          <Button icon={Plus} iconSize={15} onClick={() => setShowCreate(true)}>
            New Project
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description={isGroupHead ? 'Create a project to get started.' : 'No projects have been created yet.'}
          action={
            isGroupHead ? (
              <Button onClick={() => setShowCreate(true)}>
                Create Project
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => (
            <div
              key={p._id}
              onClick={() => (onOpenProject ? onOpenProject(p._id) : navigate(`/groups/${groupId}/projects/${p._id}`))}
              className="bg-[var(--pms-bg-inset)]/60 rounded-2xl border border-white/5 hover:border-purple-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer p-5 group"
            >
              <div className="h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-4" />
              <div className="flex items-start justify-between mb-2">
                <Heading level={4} weight="font-semibold" className="leading-snug flex-1 pr-2">{p.name}</Heading>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <StatusBadge status={p.status} />
                  {/* Only group head sees delete button */}
                  {isGroupHead && (
                    <Button
                      variant="bare"
                      size="none"
                      rounded="lg"
                      weight=""
                      icon={Trash2}
                      iconSize={13}
                      onClick={(e) => handleDelete(e, p._id, p.name)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Move project to locked folder"
                    />
                  )}
                </div>
              </div>
              <Text size="text-xs" color="text-gray-400" className="line-clamp-2 mb-3">{p.description ?? 'No description.'}</Text>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User size={11} /> {p.createdBy?.name ?? '—'}
                </span>
                {p.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {formatDate(p.deadline)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Only group head can open create modal */}
      {isGroupHead && (
        <CreateProjectModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={load}
          groupId={groupId}
        />
      )}
    </>
  );
};

export default ProjectList;