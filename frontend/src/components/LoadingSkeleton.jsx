import { motion } from 'framer-motion';

export default function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex max-w-[84%] gap-3"
    >
      <div className="rounded-3xl rounded-bl-md border border-white/5 bg-[#202c33] px-4 py-3 shadow-soft">
        <div className="space-y-2">
          <div className="h-3 w-56 animate-pulse rounded-full bg-white/6" />
          <div className="h-3 w-44 animate-pulse rounded-full bg-white/6" />
          <div className="h-3 w-36 animate-pulse rounded-full bg-white/6" />
        </div>
      </div>
    </motion.div>
  );
}
