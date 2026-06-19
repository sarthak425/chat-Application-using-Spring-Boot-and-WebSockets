import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';

export default function ToastHost() {
  const { toasts } = useToast();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="glass-card rounded-2xl px-4 py-3 text-sm text-white shadow-soft"
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
