import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { HardwareMetric } from "../types";
import { Activity, Thermometer, Database } from "lucide-react";

interface TrendChartsProps {
  id: string;
  data: HardwareMetric[];
}

export default function TrendCharts({ id, data }: TrendChartsProps) {
  const [chartType, setChartType] = useState<"temperatures" | "loads" | "ram">("temperatures");

  // Format timestamp strings for bottom x-axis representatively
  const formatTimeX = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return isoString;
    }
  };

  // Safe chart tooltip implementation
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-xl text-xs font-mono text-white">
          <p className="font-semibold text-slate-300 mb-1.5">{new Date(label).toLocaleString()}</p>
          {payload.map((pld: any) => (
            <div key={pld.name} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 font-sans" style={{ color: pld.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color }} />
                {pld.name}:
              </span>
              <span className="font-bold text-slate-100">
                {pld.value.toFixed(1)}
                {chartType === "temperatures" ? "°C" : "%"}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
        <Activity className="w-8 h-8 opacity-40 mb-2 animate-pulse" />
        <span className="text-sm font-medium">No system metrics recorded yet.</span>
        <span className="text-xs text-slate-400 mt-1">Metrics timeline will populate automatically as data is logged.</span>
      </div>
    );
  }

  return (
    <div id={id} className="p-5 border border-slate-200/80 bg-white rounded-2xl md:shadow-sm">
      {/* Chart Headers with Selectable Type Toggle buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Timeline Analytics Dashboards</h3>
          <p className="text-xs text-slate-400 mt-0.5">Visualizing real-time and historical trends ({data.length} logs stored)</p>
        </div>

        {/* Chart Selector Buttons */}
        <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setChartType("temperatures")}
            className={`flex items-center gap-1.5 justify-center flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              chartType === "temperatures"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            Thermals
          </button>
          
          <button
            onClick={() => setChartType("loads")}
            className={`flex items-center gap-1.5 justify-center flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              chartType === "loads"
                ? "bg-white text-emerald-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Loads %
          </button>
          
          <button
            onClick={() => setChartType("ram")}
            className={`flex items-center gap-1.5 justify-center flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              chartType === "ram"
                ? "bg-white text-purple-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Memory (RAM)
          </button>
        </div>
      </div>

      {/* Actual Line Graphs */}
      <div className="h-72 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="colorGpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimeX}
              stroke="#94a3b8"
              fontSize={10}
              fontFamily="monospace"
              tickLine={false}
              dy={10}
            />
            
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              domain={chartType === "temperatures" ? [30, 100] : [0, 100]}
              dx={-5}
            />
            
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />

            {/* Render selected fields conditionally */}
            {chartType === "temperatures" && (
              <>
                <Area
                  type="monotone"
                  dataKey="cpuTemp"
                  name="CPU Temperature"
                  stroke="#2563eb"
                  fillOpacity={1}
                  fill="url(#colorCpu)"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="gpuTemp"
                  name="GPU Temperature"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorGpu)"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
              </>
            )}

            {chartType === "loads" && (
              <>
                <Area
                  type="monotone"
                  dataKey="cpuLoad"
                  name="CPU Load"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorCpu)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="gpuLoad"
                  name="GPU Load"
                  stroke="#059669"
                  fillOpacity={1}
                  fill="url(#colorGpu)"
                  strokeWidth={2}
                />
              </>
            )}

            {chartType === "ram" && (
              <Area
                type="monotone"
                dataKey="ramUsage"
                name="RAM Memory Usage"
                stroke="#7c3aed"
                fillOpacity={1}
                fill="url(#colorRam)"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
