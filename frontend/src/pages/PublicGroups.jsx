import { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, Clock, LogIn,FlaskConical, ChevronRight, ArrowRight} from 'lucide-react';
import api from '../utils/api';
import SearchBar from '../components/ui/SearchBar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';

const CARD_COLORS = [
  { bar: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', btn: '#EDE9FE', btnHover: '#DDD6FE', text: '#5B21B6' },
  { bar: '#059669', bg: '#ECFDF5', border: '#6EE7B7', btn: '#D1FAE5', btnHover: '#A7F3D0', text: '#065F46' },
  { bar: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', btn: '#DBEAFE', btnHover: '#BFDBFE', text: '#1E40AF' },
  { bar: '#EA580C', bg: '#FFF7ED', border: '#FDC6A0', btn: '#FFEDD5', btnHover: '#FED7AA', text: '#9A3412' },
  { bar: '#DB2777', bg: '#FDF2F8', border: '#F9A8D4', btn: '#FCE7F3', btnHover: '#FBCFE8', text: '#9D174D' },
  { bar: '#D97706', bg: '#FFFBEB', border: '#FCD34D', btn: '#FEF3C7', btnHover: '#FDE68A', text: '#92400E' },
];

const PublicGroups = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [joining, setJoining] = useState(null);
  const [joined,  setJoined]  = useState(new Set());
  const [toast,   setToast]   = useState({ msg: '', type: 'ok' });

  useEffect(() => {
    api.get('/public/groups')
      .then(r => setGroups(r.data.groups ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'ok' }), 3500);
  };

  const handleJoin = async (e, groupId) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    setJoining(groupId);
    try {
      await api.post(`/group/${groupId}/join-request`);
      setJoined(prev => new Set([...prev, groupId]));
      showToast('Join request sent to the group head!');
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to send request', 'err');
    } finally {
      setJoining(null);
    }
  };

  const memberStatus = (group) => {
    if (!user) return 'none';
    const headId = group.groupHead?._id ?? group.groupHead;
    if (headId?.toString() === user.id?.toString()) return 'head';
    const m = (group.members || []).find(
      m => (m.userId?._id || m.userId)?.toString() === user.id?.toString()
    );
    if (!m) return joined.has(group._id) ? 'pending' : 'none';
    return m.status;
  };

  // Always navigate to /groups/:id — works for both admin and employee
  const handleCardClick = (group) => {
    const status = memberStatus(group);
    if (!user) { navigate('/login'); return; }
    if (status === 'accepted' || status === 'head') {
      navigate(`/groups/${group._id}`, { state: { returnTo: '/groups' } });
    }
  };

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="w-full mt-4">
        <div className="relative w-full overflow-hidden py-[60px] text-center mb-[24px] rounded-b-[60px] shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#1f1a42,#2d265e)] opacity-95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent)]"></div>
          <div className="relative z-10 px-4 max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4 backdrop-blur-sm">
              <FlaskConical size={14} className="text-yellow-300" />
              <span className="text-sm text-white font-medium">Company Group Directory</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
              Active Groups<br className="hidden md:block" />Directory
            </h1>
            <p className="text-gray-300 mx-auto text-base md:text-lg lg:text-xl max-w-3xl font-light tracking-wide leading-relaxed mb-6">
              Browse active company groups, group heads, and general membership totals.
            </p>
            <div className="max-w-md mx-auto relative z-20">
              <SearchBar
                variant="hero"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search groups..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast
        msg={toast.msg}
        type={toast.type}
        onClose={() => setToast({ msg: '', type: 'ok' })}
      />

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500 text-sm font-medium">{filtered.length} group{filtered.length !== 1 ? 's' : ''} found</p>
          {!user && (
            <Button
              variant="ghost"
              icon={LogIn}
              onClick={() => navigate('/login')}
              className="!text-purple-600 hover:!text-purple-800 hover:!bg-transparent !font-semibold"
            >
              Login to join groups
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-56 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <FlaskConical size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-500 mb-2">No groups found</h3>
            <p className="text-gray-400 text-sm">Try a different search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((g, idx) => {
              const color       = CARD_COLORS[idx % CARD_COLORS.length];
              const status      = memberStatus(g);
              const memberCount = (g.members || []).filter(m => m.status === 'accepted').length;
              const headName    = g.groupHead?.name ?? g.createdBy?.name;

              return (
                <Card
                  key={g._id}
                  variant="plain"
                  onClick={() => handleCardClick(g)}
                  style={{ background: color.bg, border: `1.5px solid ${color.border}` }}
                  className="flex flex-col shadow-sm hover:-translate-y-1 hover:shadow-md cursor-pointer"
                >
                  {g.coverPhoto ? (
                    <div className="h-32 overflow-hidden">
                      <img
                        src={g.coverPhoto}
                        alt={g.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${g.coverPosition?.x ?? 50}% ${g.coverPosition?.y ?? 50}%` }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: '6px', background: color.bar, flexShrink: 0 }} />
                  )}

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900 text-base leading-snug flex-1 pr-2">{g.name}</h3>
                      <span className="shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">Active</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{g.description || 'No description provided.'}</p>
                    <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users size={13} /> {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                      {headName && <span>Head: <span className="font-semibold" style={{ color: color.bar }}>{headName}</span></span>}
                    </div>

                    {status === 'head' ? (
                      <Button
                        onClick={() => handleCardClick(g)}
                        icon={CheckCircle}
                        size="lg"
                        rounded="xl"
                        className="w-full !font-semibold"
                        style={{ background: color.btn, color: color.text, border: `1px solid ${color.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = color.btnHover}
                        onMouseLeave={e => e.currentTarget.style.background = color.btn}
                      >
                        Group Head — Manage <ArrowRight size={14} />
                      </Button>
                    ) : status === 'accepted' ? (
                      <Button
                        onClick={() => handleCardClick(g)}
                        icon={CheckCircle}
                        size="lg"
                        rounded="xl"
                        className="w-full !font-semibold"
                        style={{ background: color.btn, color: color.text, border: `1px solid ${color.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = color.btnHover}
                        onMouseLeave={e => e.currentTarget.style.background = color.btn}
                      >
                        Member — View Group <ArrowRight size={14} />
                      </Button>
                    ) : status === 'pending' ? (
                      <div className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl"
                        style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                        <Clock size={15} /> Request Pending
                      </div>
                    ) : (
                      <Button
                        onClick={(e) => handleJoin(e, g._id)}
                        disabled={joining === g._id}
                        icon={ChevronRight}
                        size="lg"
                        rounded="xl"
                        className="w-full"
                        style={{ background: color.btn, color: color.text, border: `1px solid ${color.border}` }}
                        onMouseEnter={e => { if (joining !== g._id) e.currentTarget.style.background = color.btnHover; }}
                        onMouseLeave={e => e.currentTarget.style.background = color.btn}
                      >
                        {joining === g._id ? 'Sending…' : 'Request to Join'}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicGroups;