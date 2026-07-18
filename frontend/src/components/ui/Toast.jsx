
import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

const types = {
  ok:  { bg: 'bg-blue-600',  icon: CheckCircle },
  err: { bg: 'bg-red-600',   icon: XCircle },
  success: { bg: 'bg-green-600', icon: CheckCircle },
};
const Toast = ({ msg, type = 'ok', onClose, duration = 3500 }) => {
  const { bg, icon: Icon } = types[type] ?? types.ok;

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [msg, duration, onClose]);

  if (!msg) return null;

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-medium text-white ${bg} transition-all`}
    >
      <Icon size={16} />
      {msg}
      <button onClick={onClose} className="ml-2 hover:opacity-70 transition">
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;