import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Draggable Modal Content (Handles internal drag state safely)
 */
const ModalContent = ({ onClose, title, subtitle, children, size }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 }); // Naturally initializes to {0,0} on every mount
  const [dragging, setDragging] = useState(false);
  const startRef = useRef(null);
  const modalRef = useRef(null);

  // Handle document scroll locking safely
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Drag handlers
  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('select')) return;
    setDragging(true);
    startRef.current = {
      mx: e.clientX,
      my: e.clientY,
      px: pos.x,
      py: pos.y,
    };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = e.clientX - startRef.current.mx;
      const dy = e.clientY - startRef.current.my;
      setPos({ x: startRef.current.px + dx, y: startRef.current.py + dy });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

  return (
    <div
      ref={modalRef}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      className={`w-full ${widths[size]} bg-[var(--pms-bg-modal)] border border-[var(--pms-bg-header)] rounded-2xl shadow-2xl overflow-hidden select-none`}
    >
      {/* Draggable header */}
      <div
        onMouseDown={onMouseDown}
        className={`flex items-center justify-between px-6 py-4 bg-[var(--pms-bg-header)] border-b border-white/5 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div>
          <h3 className="font-semibold text-white select-none">{title}</h3>
          {subtitle && <div className="mt-0.5 select-none">{subtitle}</div>}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body — scrolls internally once content is taller than the viewport,
          so the footer buttons (Save/Cancel etc.) never get pushed off-screen
          and the modal itself never needs to be dragged just to reach them. */}
      <div className="p-6 select-text max-h-[75vh] overflow-y-auto">{children}</div>
    </div>
  );
};

/**
 * Main Modal Wrapper
 */
const Modal = ({ isOpen, onClose, title, subtitle, children, size = 'md' }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 
        Key optimization: Giving this a unique key forces React to completely discard 
        the old state and start clean at {x:0, y:0} whenever a fresh instance opens.
      */}
      <ModalContent 
        key={isOpen ? 'open' : 'closed'} 
        onClose={onClose} 
        title={title} 
        subtitle={subtitle}
        size={size}
      >
        {children}
      </ModalContent>
    </div>
  );
};

export default Modal;