import { motion } from 'framer-motion';
import icon from '../../assets/images/pms-icon.png';

const Loading = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--pms-bg-void)]">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-32 w-32 animate-spin rounded-full border-t-2 border-b-2 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
        <div className="absolute h-20 w-20 animate-pulse rounded-full bg-gradient-to-br from-purple-600 to-indigo-800 opacity-75 blur-xl" />
        <motion.img
          src={icon}
          alt="PMS"
          className="relative h-16 w-16 md:h-20 md:w-20 object-contain"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: [0.92, 1.04, 0.92] }}
          transition={{
            opacity: { duration: 0.5 },
            scale: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </div>

      <div className="mt-12 text-sm font-medium tracking-[0.3em] text-purple-300/60 uppercase animate-pulse">
        Initializing PMS Workspace...
      </div>
    </div>
  );
};

export default Loading;