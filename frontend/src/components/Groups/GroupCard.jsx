import { useNavigate } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge';
import Heading from '../ui/Heading';
import Text from '../ui/Text';
import Button from '../ui/Button';
import { Users } from 'lucide-react';
import { CARD_COLORS } from '../../utils/cardColors';
const GroupCard = ({
  group,
  canManage = false,
  onApprove,
  index = 0,
  onClick,
  badge,
  footer,
}) => {
  const navigate = useNavigate();
  const color       = CARD_COLORS[index % CARD_COLORS.length];
  const memberCount = (group.members ?? []).filter(m => !m.status || m.status === 'accepted').length;
  const headName    = group.groupHead?.name ?? group.createdBy?.name ?? '—';

  return (
    <div
      onClick={onClick ?? (() => navigate(`/groups/${group._id}`))}
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
        <div className="flex items-start justify-between mb-2 gap-3">
          <Heading level={3} size="text-base" className="leading-snug flex-1 pr-2">{group.name}</Heading>
          {badge ?? <StatusBadge status={group.status ?? 'active'} />}
        </div>

        <Text size="text-xs" color="text-gray-400" className="line-clamp-2 mb-3 flex-1">
          {group.description || 'No description provided.'}
        </Text>

        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <Users size={12} /> {memberCount} member{memberCount !== 1 ? 's' : ''}
          </span>
          <span>
            Head: <span className="font-semibold" style={{ color: color.bar }}>{headName}</span>
          </span>
        </div>

        {footer !== undefined ? footer : (
          canManage && onApprove && group.status === 'pending' && (
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                variant="success"
                size="sm"
                className="w-full justify-center"
                onClick={onApprove}
              >
                Approve
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default GroupCard;