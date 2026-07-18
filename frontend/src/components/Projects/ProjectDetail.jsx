import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../services/projectTaskService';
import StatusBadge from '../ui/StatusBadge';
import TaskList from '../Tasks/TaskList';
import { formatDate } from '../../utils/date';
import { Calendar, User, Paperclip, Trash2, Download, PauseCircle, PlayCircle, ChevronRight, Layers } from 'lucide-react';
import DetailBackButton from '../ui/DetailBackButton';
import IconLink from '../ui/IconLink';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Model';
import Heading from '../ui/Heading';
import Text from '../ui/Text';

const WORKFLOW_STAGES = ['pending', 'initiated', 'in_design', 'design_progress_phase', 'progress', 'finalization', 'acceptance', 'completed'];
const stageLabel = (s) => ({
  pending: 'Pending', initiated: 'Initiated', in_design: 'In Design',
  design_progress_phase: 'Design & Progress', progress: 'Progress',
  finalization: 'Finalization', acceptance: 'Acceptance', completed: 'Completed',
}[s] ?? s);

const ProjectDetail = ({ groupId, projectId, accessLevel: fallbackLevel = 0, onBack, backLabel = 'Back to Group' }) => {
  const [project,  setProject]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseForm, setPauseForm] = useState({ pauseReason: '', description: '', expectedResolutionDate: '' });
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [changingStage, setChangingStage] = useState(false);
  const [lockingDesign, setLockingDesign] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    projectService.getById(groupId, projectId)
      .then(r => setProject(r.data.project ?? r.data))
      .catch(() => setError('Could not load project.'))
      .finally(() => setLoading(false));
  }, [groupId, projectId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!window.confirm(`Move project "${project.name}" to the locked folder?`)) return;
    setDeleting(true);
    try {
      await projectService.delete(groupId, projectId);
      navigate(`/groups/${groupId}`);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to lock project');
      setDeleting(false);
    }
  };

  const handleChangeStage = async (newStatus) => {
    setShowStageMenu(false);
    const remarks = window.prompt(`Remarks for moving to "${stageLabel(newStatus)}"? (optional)`) ?? '';
    setChangingStage(true);
    try {
      await projectService.changeWorkflowStatus(groupId, projectId, newStatus, remarks);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to change workflow status');
    } finally {
      setChangingStage(false);
    }
  };

  // Feature #13b — admin/head declares no more tasks will be added
  const handleLockDesignPhase = async () => {
    if (!window.confirm('No more tasks will be added to this project — mark the design phase as complete?')) return;
    const remarks = window.prompt('Remarks (optional)?') ?? '';
    setLockingDesign(true);
    try {
      await projectService.lockDesignPhase(groupId, projectId, remarks);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to close design phase');
    } finally {
      setLockingDesign(false);
    }
  };

  // Feature #14 — pause / resume
  const submitPause = async (e) => {
    e.preventDefault();
    if (!pauseForm.pauseReason.trim() || !pauseForm.description.trim()) return;
    setPausing(true);
    try {
      await projectService.pause(groupId, projectId, pauseForm.pauseReason, pauseForm.description, pauseForm.expectedResolutionDate || undefined);
      setShowPauseModal(false);
      setPauseForm({ pauseReason: '', description: '', expectedResolutionDate: '' });
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to pause project');
    } finally {
      setPausing(false);
    }
  };

  const handleResume = async () => {
    const resolvedSolution = window.prompt('How was this resolved? (optional)') ?? '';
    setResuming(true);
    try {
      await projectService.resume(groupId, projectId, resolvedSolution);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to resume project');
    } finally {
      setResuming(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-purple-500/40 border-t-purple-500 animate-spin" />
        <Text size="text-sm" color="text-gray-400" className="animate-pulse">Loading project…</Text>
      </div>
    </div>
  );
  if (error)    return <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl text-sm">{error}</div>;
  if (!project) return null;

  const rawLevel       = project.access_level ?? fallbackLevel;
  const effectiveLevel = rawLevel === 1 ? 1 : 0;
  const isGroupHead    = effectiveLevel === 1;
  const progress       = project.progress ?? { overallProgress: 0, completedPercent: 0, remainingPercent: 100, totalWeightAssigned: 0, unassignedWeight: 100 };
  const currentStageIdx = WORKFLOW_STAGES.indexOf(project.workflowStage ?? 'pending');

  // Feature #6 — group project files by fileGroupId, show latest version, list older ones
  const fileGroups = Object.values(
    (project.files ?? []).reduce((acc, f) => {
      const key = f.fileGroupId || f._id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    }, {})
  ).map(versions => versions.sort((a, b) => (b.version || 1) - (a.version || 1)));

  return (
    <div className="space-y-6">
      {onBack ? (
        <DetailBackButton onClick={onBack}>{backLabel}</DetailBackButton>
      ) : (
        <DetailBackButton to={`/groups/${groupId}`}>{backLabel}</DetailBackButton>
      )}

      {/* Feature #14 — pause banner */}
      {project.isPaused && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PauseCircle size={20} className="text-orange-400 flex-shrink-0" />
            <Text size="text-sm" color="text-orange-300">This project is currently <span className="font-bold">paused</span>. An admin has been notified.</Text>
          </div>
          {(isGroupHead || fallbackLevel === 1) && (
            <Button
              variant="orangeTint"
              size="sm"
              rounded="lg"
              icon={PlayCircle}
              iconSize={13}
              disabled={resuming}
              onClick={handleResume}
              className="flex-shrink-0"
            >
              {resuming ? 'Resuming…' : 'Resume Project'}
            </Button>
          )}
        </div>
      )}

      {/* Project header card */}
      <div className="bg-[var(--pms-bg-deep-3)] rounded-2xl border border-purple-900/30 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-purple-600 to-indigo-500" />
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1 min-w-0 pr-4">
              <Heading level={1} size="text-2xl">{project.name}</Heading>
              <Text size="text-sm" color="text-gray-400" className="mt-1 leading-relaxed">{project.description}</Text>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={project.status} />
              {isGroupHead && !project.isPaused && (
                <Button
                  variant="orangeOutline"
                  size="sm"
                  rounded="lg"
                  weight="font-normal"
                  icon={PauseCircle}
                  iconSize={13}
                  onClick={() => setShowPauseModal(true)}
                >
                  Pause
                </Button>
              )}
              {isGroupHead && (
                <Button
                  variant="danger"
                  size="sm"
                  rounded="lg"
                  weight="font-normal"
                  icon={Trash2}
                  iconSize={13}
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? 'Moving…' : 'Lock'}
                </Button>
              )}
            </div>
          </div>

          {/* Feature #13 — workflow stage stepper */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <Text size="text-xs" color="text-gray-500" className="uppercase tracking-wide">Workflow Stage</Text>
              {isGroupHead && (
                <div className="flex items-center gap-3">
                  {!project.designPhaseLocked && (
                    <IconLink
                      size="xs"
                      onClick={handleLockDesignPhase}
                      disabled={lockingDesign}
                      className="disabled:opacity-50"
                    >
                      {lockingDesign ? 'Closing…' : 'Close design phase'}
                    </IconLink>
                  )}
                  {project.designPhaseLocked && (
                    <Text size="text-xs" color="text-green-400" weight="font-semibold">Design phase closed</Text>
                  )}
                <div className="relative">
                  <IconLink
                    size="xs"
                    onClick={() => setShowStageMenu(p => !p)}
                    disabled={changingStage}
                    className="disabled:opacity-50"
                  >
                    Change stage
                  </IconLink>
                  {showStageMenu && (
                    <div className="absolute right-0 mt-1 z-20 bg-[var(--pms-bg-header)] border border-purple-900/40 rounded-xl shadow-xl overflow-hidden w-48">
                      {WORKFLOW_STAGES.map(s => (
                        <button
                          key={s}
                          onClick={() => handleChangeStage(s)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition ${s === project.workflowStage ? 'text-purple-300 font-semibold' : 'text-gray-300'}`}
                        >
                          {stageLabel(s)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {WORKFLOW_STAGES.map((s, i) => (
                <div key={s} className="flex items-center flex-shrink-0">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap ${
                    i < currentStageIdx ? 'bg-green-500/15 text-green-400' :
                    i === currentStageIdx ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-500/50' :
                    'bg-white/5 text-gray-500'
                  }`}>
                    {stageLabel(s)}
                  </span>
                  {i < WORKFLOW_STAGES.length - 1 && <ChevronRight size={12} className="text-gray-600 mx-0.5 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Feature #12 — progress based on tasks */}
          <div className="mb-5 bg-[var(--pms-bg-inset)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <Text size="text-xs" color="text-gray-500" className="uppercase tracking-wide flex items-center gap-1"><Layers size={11} /> Project Progress (from tasks)</Text>
              <Text size="text-sm" weight="font-bold" color="text-white">{progress.completedPercent}%</Text>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-green-400 transition-all" style={{ width: `${progress.completedPercent}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-gray-500">
              <span>Completed: {progress.completedPercent}%</span>
              <span>Remaining: {progress.remainingPercent}%</span>
              <span>{progress.unassignedWeight > 0 ? `${progress.unassignedWeight}% unassigned to any task` : 'Fully weighted'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            <div>
              <Text size="text-xs" color="text-gray-500" className="uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <User size={11} /> Created by
              </Text>
              <Text size="text-sm" weight="font-semibold" color="text-white">{project.createdBy?.name ?? '—'}</Text>
            </div>
            <div>
              <Text size="text-xs" color="text-gray-500" className="uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Calendar size={11} /> Deadline
              </Text>
              <Text size="text-sm" weight="font-semibold" color="text-white">
                {project.deadline ? formatDate(project.deadline) : 'No deadline'}
              </Text>
            </div>
            <div>
              <Text size="text-xs" color="text-gray-500" className="uppercase tracking-wide mb-1.5">Status</Text>
              <StatusBadge status={project.status} />
            </div>
          </div>

          {project.adminNote && (
            <div className="mt-4 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <Text size="text-xs" color="text-yellow-400" weight="font-semibold" className="uppercase mb-1">Admin Note</Text>
              <Text size="text-sm" color="text-yellow-300">{project.adminNote}</Text>
            </div>
          )}

          {fileGroups.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <Text size="text-xs" color="text-gray-500" className="uppercase tracking-wide mb-2 flex items-center gap-1">
                <Paperclip size={11} /> Attachments
              </Text>
              <div className="flex flex-wrap gap-2">
                {fileGroups.map(versions => {
                  const latest = versions[0];
                  return (
                    <div key={latest._id} className="flex items-center gap-1">
                      <a
                        href={`data:${latest.mimeType};base64,${latest.data}`}
                        download={latest.name}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 hover:bg-purple-500/10 hover:border-purple-500/40 hover:text-purple-300 transition"
                      >
                        <Download size={12} /> {latest.name}
                        {versions.length > 1 && <span className="text-purple-400 font-semibold">v{latest.version}</span>}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tasks section */}
      <div className="bg-[var(--pms-bg-deep-3)] rounded-2xl border border-purple-900/30 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-600 to-purple-500" />
        <div className="p-6">
          <TaskList groupId={groupId} projectId={projectId} accessLevel={effectiveLevel} />
        </div>
      </div>

      {/* Feature #14 — pause modal */}
      <Modal isOpen={showPauseModal} onClose={() => setShowPauseModal(false)} title="Pause Project" size="md">
        <form onSubmit={submitPause} className="space-y-3">
          <Input
            label="Reason"
            required
            value={pauseForm.pauseReason}
            onChange={e => setPauseForm({ ...pauseForm, pauseReason: e.target.value })}
            placeholder="e.g. Blocked on client feedback"
          />
          <Textarea
            label="Description"
            required
            rows={3}
            value={pauseForm.description}
            onChange={e => setPauseForm({ ...pauseForm, description: e.target.value })}
            placeholder="Details about the issue"
          />
          <Input
            label="Expected Resolution Date (optional)"
            type="date"
            value={pauseForm.expectedResolutionDate}
            onChange={e => setPauseForm({ ...pauseForm, expectedResolutionDate: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowPauseModal(false)}>Cancel</Button>
            <Button variant="orangeSolid" type="submit" loading={pausing}>
              {pausing ? 'Pausing…' : 'Pause Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectDetail;