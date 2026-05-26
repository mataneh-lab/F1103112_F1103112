import { useState } from "react";
import { Sparkles, Loader2, Thermometer, ShieldCheck, RefreshCw, Cpu, Activity, Lightbulb } from "lucide-react";
import { SystemAnalysis, Thresholds } from "../types";

interface AdvicePanelProps {
  id: string;
  thresholds: Thresholds;
  onRefreshTrigger?: () => void;
}

export default function AdvicePanel({ id, thresholds, onRefreshTrigger }: AdvicePanelProps) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<SystemAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOptimizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/optimize-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholds }),
      });
      if (!response.ok) {
        throw new Error("Server failed to generate optimizer audit.");
      }
      const data = await response.json();
      setAdvice(data);
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to contact Gemini Optimization Advisor.");
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    optimal: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-800",
      dot: "bg-emerald-500",
      label: "Optimal Core Thermal Levels",
      desc: "Your computer is functioning inside highly efficient, stable thermal boundaries. Minimal hardware throttle hazards."
    },
    warning: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      dot: "bg-amber-500",
      label: "Elevated Core Thermal Warnings",
      desc: "Moderate temperature levels or hardware strains found in logs. Performance could be slightly throttled to manage heat."
    },
    critical: {
      bg: "bg-rose-50 border-rose-200/80",
      text: "text-rose-800",
      dot: "bg-rose-500 animate-ping",
      label: "CRITICAL THERMAL LIMIT WARNING",
      desc: "High persistent temperature spikes detected in logging history! CPU/GPU components are throttling rapidly. Thermal damage hazard!"
    }
  };

  return (
    <div id={id} className="p-5 border border-slate-200/80 bg-white rounded-2xl md:shadow-sm">
      {/* Header section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-slate-800 tracking-tight">AI Optimization & Bottleneck Advisor</h3>
        </div>
        
        <button
          onClick={fetchOptimizations}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {advice ? "Re-Audit Hardware" : "Audit System Performance"}
        </button>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mb-4 text-left">
        Submit your collected temperature logs to local Gemini 3.5 AI. It crawls system patterns 
        and extracts custom adjustments tailored explicitly to your machine's hardware balance.
      </p>

      {/* Error state if any */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-medium mb-4 text-left">
          {error}
        </div>
      )}

      {/* Actual advice display */}
      {advice ? (
        <div className="space-y-4 text-left">
          {/* Diagnostic Status Box */}
          <div className={`p-4 border rounded-xl flex items-start gap-3.5 ${statusColors[advice.status].bg}`}>
            <div className="relative mt-1">
              <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75 ${statusColors[advice.status].dot}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColors[advice.status].dot.replace("animate-ping", "")}`} />
            </div>
            
            <div className="flex-1">
              <h4 className={`text-sm font-bold ${statusColors[advice.status].text}`}>
                {statusColors[advice.status].label}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {statusColors[advice.status].desc}
              </p>
            </div>
          </div>

          {/* Component Assessments grids */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* CPU Assessment */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                <Cpu className="w-3.5 h-3.5 text-rose-500" />
                CPU Thermals
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                {advice.cpuSummary}
              </p>
            </div>

            {/* GPU Assessment */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                GPU Core Profile
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                {advice.gpuSummary}
              </p>
            </div>

            {/* RAM Assessment */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                Memory RAM Bounds
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                {advice.ramSummary}
              </p>
            </div>
          </div>

          {/* AI Core recommendations bullets list */}
          <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl text-slate-200">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Engineers Tactical Checklists:
            </h4>
            <ul className="space-y-2.5">
              {advice.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-800 text-[10px] text-indigo-300 font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-slate-300 leading-relaxed font-sans">{rec}</span>
                </li>
              ))}
            </ul>
            {advice.geminiAdvised && (
              <div className="mt-4 text-[10px] text-slate-500 text-right font-mono italic">
                * Recommendations compiled dynamically via server-side Gemini 3.5 Flash
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
          {loading ? (
            <>
              <Loader2 className="w-8 h-8 opacity-60 text-indigo-500 animate-spin mb-3" />
              <span className="text-sm font-medium text-slate-600">Analyzing temperature files & tracking logs...</span>
              <span className="text-xs text-slate-400 mt-1">Consulting Gemini Performance core systems...</span>
            </>
          ) : (
            <>
              <Lightbulb className="w-8 h-8 opacity-40 mb-2" />
              <span className="text-sm font-medium">No Performance Diagnosis loaded.</span>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                Click "Audit System Performance" above. Gemini will scan historic logs to construct custom optimization suggestions.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
