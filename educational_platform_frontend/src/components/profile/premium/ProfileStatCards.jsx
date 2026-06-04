import { motion } from 'framer-motion';
import { Users, UserCheck, Network, FileText } from 'lucide-react';
import { formatStatValue } from '@/components/profile/lovable/profileHeaderUtils';

const STAT_CONFIG = [
  {
    key: 'followers',
    label: 'Followers',
    icon: Users,
    iconCls: 'text-violet-600 dark:text-violet-400',
    bgCls: 'bg-violet-500/10 dark:bg-violet-500/15',
  },
  {
    key: 'following',
    label: 'Following',
    icon: UserCheck,
    iconCls: 'text-sky-600 dark:text-sky-400',
    bgCls: 'bg-sky-500/10 dark:bg-sky-500/15',
  },
  {
    key: 'connections',
    label: 'Connections',
    icon: Network,
    iconCls: 'text-primary',
    bgCls: 'bg-primary/10 dark:bg-primary/15',
  },
  {
    key: 'posts',
    label: 'Posts',
    icon: FileText,
    iconCls: 'text-emerald-600 dark:text-emerald-400',
    bgCls: 'bg-emerald-500/10 dark:bg-emerald-500/15',
  },
];

const EASE = [0.22, 1, 0.36, 1];

export default function ProfileStatCards({ stats = {} }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {STAT_CONFIG.map((s, i) => {
        const Icon = s.icon;
        const value = stats[s.key] ?? 0;
        return (
          <motion.div
            key={s.key}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-300"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + i * 0.06, duration: 0.38, ease: EASE }}
            whileHover={{ y: -2, transition: { duration: 0.2, ease: EASE } }}
          >
            <div className="absolute inset-0 bg-gradient-primary opacity-0 transition-opacity duration-300 group-hover:opacity-[0.04]" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {s.label}
                </p>
                <p
                  className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.75rem]"
                  style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', lineHeight: 1.1 }}
                >
                  {formatStatValue(value)}
                </p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110 ${s.bgCls} ${s.iconCls}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
