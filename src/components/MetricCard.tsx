import { LucideIcon, Flame, AlertTriangle } from "lucide-react";

interface MetricCardProps {
  id: string;
  title: string;
  value: number;
  unit: string;
  loadValue: number;
  icon: LucideIcon;
  thresholdTemp: number;
  thresholdLoad: number;
  isTempExceeded: boolean;
  isLoadExceeded: boolean;
  accentColor: string;
  subLabel?: string;
}

export default function MetricCard({
  id,
  title,
  value,
  unit,
  loadValue,
  icon: Icon,
  thresholdTemp,
  thresholdLoad,
  isTempExceeded,
  isLoadExceeded,
  accentColor,
  subLabel
}: MetricCardProps) {
  // Determine color status for temperature alert
  const getTempColorClass = () => {
    if (isTempExceeded) return "text-rose-600 font-semibold drop-shadow-sm";
    if (value >= thresholdTemp - 8) return "text-amber-500 font-semibold";
    return "text-slate-900"; // fallback default for the Professional Polish theme
  };

  // Determine border class for threshold warn status
  const getBorderColorClass = () => {
    if (isTempExceeded || isLoadExceeded) {
      return "border-rose-500 shadow-md shadow-rose-500/15 animate-pulse layer-glow";
    }
    return "border-slate-200 hover:border-slate-300 md:hover:shadow-sm";
  };

  // Determine accent color theme for badges & loaders
  const themeColors: Record<string, { badgeText: string; progressBg: string; fill: string }> = {
    rose: { badgeText: "text-blue-600", progressBg: "bg-blue-500", fill: "bg-blue-100" }, // Maps to CPU in the Design HTML
    indigo: { badgeText: "text-emerald-600", progressBg: "bg-emerald-500", fill: "bg-emerald-100" }, // Maps to GPU in the Design HTML
    teal: { badgeText: "text-indigo-600", progressBg: "bg-indigo-500", fill: "bg-indigo-100" }, // Maps to RAM
  };

  const activeTheme = themeColors[accentColor] || themeColors.rose;

  return (
    <div
      id={id}
      className={`relative flex flex-col justify-between p-5 rounded-xl border bg-white transition-all duration-300 ${getBorderColorClass()}`}
    >
      {/* Background status overlay warning alerts */}
      {(isTempExceeded || isLoadExceeded) && (
        <div className="absolute inset-0 bg-rose-50/20 rounded-xl pointer-events-none -z-10" />
      )}

      {/* Header element */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="text-slate-400 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left">
            {title}
          </span>
        </div>
        
        {/* Sub title core descriptor matching Professional Polish design */}
        {subLabel && (
          <span className={`${activeTheme.badgeText} font-mono text-xs font-semibold`}>
            {subLabel}
          </span>
        )}
      </div>

      {/* Massive display figure styled as requested */}
      <div className="flex items-baseline gap-1 my-2 text-left">
        <span className={`text-5xl font-light tracking-tight transition-colors duration-500 ${getTempColorClass()}`}>
          {value.toFixed(1)}
        </span>
        <span className="text-xl text-slate-400 font-light">{unit}</span>
      </div>

      {/* Interactive dynamic bars */}
      <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isTempExceeded || isLoadExceeded ? "bg-rose-500" : activeTheme.progressBg
          }`}
          style={{ width: `${Math.min(100, Math.max(3, loadValue))}%` }}
        />
      </div>

      {/* Grid summary details with crisp border-t spacing */}
      <div className="mt-3.5 pt-2 border-t border-slate-100 flex justify-between text-xs font-medium">
        <span className="text-slate-500 flex items-center gap-1.5 font-sans">
          Load Rate: <strong className="text-slate-700 font-mono font-bold">{Math.round(loadValue)}%</strong>
        </span>
        <span className="text-slate-400 font-sans">
          Limit: <strong className="text-slate-500 font-mono font-medium">{thresholdTemp}°C</strong>
        </span>
      </div>

      {/* Absolute Alerts floaters when hardware is critically heavy */}
      {isTempExceeded && (
        <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black rounded-sm bg-rose-600 text-white animate-bounce">
          <Flame className="w-2.5 h-2.5" />
          HOT OVERHEAT
        </span>
      )}
    </div>
  );
}
