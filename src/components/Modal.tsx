import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  size = 'lg',
}: {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  const width = size === 'md' ? 'max-w-xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-3xl';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[80]"
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className={`fixed inset-0 z-[90] p-4 sm:p-8 flex items-center justify-center`}
          >
            <div className={`w-full ${width} glass-card overflow-hidden`}>
              <div className="px-6 py-5 border-b border-white/50 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {title && <div className="text-base sm:text-lg font-extrabold text-navy truncate">{title}</div>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-sky/40 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-auto">{children}</div>
              {footer ? <div className="px-6 py-5 border-t border-white/50 bg-white/20">{footer}</div> : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

