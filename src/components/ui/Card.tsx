import { motion } from 'framer-motion';
// FIX: The path below is now correct (Go up two levels to find 'lib')
import { cn } from '../../lib/utils'; 

export const Card = ({ children, className, onClick, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: delay * 0.1, ease: "easeOut" }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "relative overflow-hidden bg-zinc-900/80 backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
      className
    )}
  >
    {/* Neon Glow */}
    <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
    
    {children}
  </motion.div>
);