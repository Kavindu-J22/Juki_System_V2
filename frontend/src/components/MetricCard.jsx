import React from 'react';

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'cyan', // cyan, emerald, amber, rose, indigo, violet
  badge,
  isCurrency = true,
  currencyPrefix = 'LKR',
}) => {
  const colorStyles = {
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      bgGlow: 'from-cyan-500/10 via-transparent to-transparent',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      textAccent: 'text-cyan-400',
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      bgGlow: 'from-emerald-500/10 via-transparent to-transparent',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      textAccent: 'text-emerald-400',
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      bgGlow: 'from-amber-500/10 via-transparent to-transparent',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      textAccent: 'text-amber-400',
    },
    rose: {
      border: 'border-rose-500/20 hover:border-rose-500/40',
      bgGlow: 'from-rose-500/10 via-transparent to-transparent',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      textAccent: 'text-rose-400',
    },
    indigo: {
      border: 'border-indigo-500/20 hover:border-indigo-500/40',
      bgGlow: 'from-indigo-500/10 via-transparent to-transparent',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      textAccent: 'text-indigo-400',
    },
    violet: {
      border: 'border-purple-500/20 hover:border-purple-500/40',
      bgGlow: 'from-purple-500/10 via-transparent to-transparent',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      textAccent: 'text-purple-400',
    },
  };

  const style = colorStyles[color] || colorStyles.cyan;

  const formattedValue = typeof value === 'number'
    ? isCurrency
      ? `${currencyPrefix} ${value.toLocaleString()}`
      : value.toLocaleString()
    : value;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl glass-card border p-5 transition-all duration-300 hover:shadow-xl ${style.border}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${style.bgGlow} pointer-events-none`} />

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <div className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-1.5">
            <span>{formattedValue}</span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-xl border ${style.iconBg} shadow-inner`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {badge && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">{badge.label}</span>
          <span className={`font-semibold ${style.textAccent}`}>{badge.value}</span>
        </div>
      )}
    </div>
  );
};
