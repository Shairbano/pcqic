const variants = {
    pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    approved:  'bg-green-500/10  text-green-400  border-green-500/30',
    rejected:  'bg-red-500/10    text-red-400    border-red-500/30',
    active:    'bg-blue-500/10   text-blue-400   border-blue-500/30',
    completed: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    default:   'bg-white/5       text-gray-400   border-white/10',
  };
  
  const StatusBadge = ({ status = 'default', label }) => {
    const cls = variants[status.toLowerCase()] ?? variants.default;
    return (
      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${cls}`}>
        {label ?? status}
      </span>
    );
  };
  
  export default StatusBadge;