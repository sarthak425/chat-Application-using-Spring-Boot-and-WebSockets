import { motion } from 'framer-motion';
import { FiMessageCircle } from 'react-icons/fi';

export default function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="group flex max-w-[84%] gap-3"
    >
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-wa-accent to-wa-accentDark text-white shadow-soft">
        <FiMessageCircle />
      </div>

      <div className="relative rounded-3xl px-4 py-3 shadow-soft">
        <div className="space-y-2">
          <div className="h-3 w-56 animate-pulse rounded-full bg-white/6" />
          <div className="h-3 w-44 animate-pulse rounded-full bg-white/6" />
          <div className="h-3 w-36 animate-pulse rounded-full bg-white/6" />
        </div>
      </div>
    </motion.div>
  );
}
