import { useState, useEffect, useCallback, useRef } from "react";
import {
  Cpu,
  Zap,
  Database,
  Sliders,
  Bell,
  Play,
  Square,
  Download,
  Trash2,
  AlertOctagon,
  RefreshCw,
  LineChart,
  Code2,
  Sparkles,
  Info
} from "lucide-react";
import { HardwareMetric, Thresholds } from "./types";
import MetricCard from "./components/MetricCard";
import TrendCharts from "./components/TrendCharts";
import InstructionPanel from "./components/InstructionPanel";
import AdvicePanel from "./components/AdvicePanel";

const BASE_URL = import.meta.env.VITE_API_URL || "";

export default function App() {
  const [metrics, setMetrics] = useState<HardwareMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(3); // seconds
  const [activeSubTab, setActiveSubTab] = useState<"charts" | "ai" | "remote">("charts");
  
  // Real-time alarm configuration triggers
  const [thresholds, setThresholds] = useState<Thresholds>({
    cpuTemp: 78,
    cpuLoad: 85,
    gpuTemp: 80,
    gpuLoad: 90,
    ramUsage: 85,
  });

  // Load custom alerts from localStorage on mount if present
  useEffect(() => {
    const cachedThresholds = localStorage.getItem("hardware_thresholds");
    if (cachedThresholds) {
      try {
        setThresholds(JSON.parse(cachedThresholds));
      } catch (e) {
        console.error("Failed to parse cached thresholds, using defaults.");
      }
    }
  }, []);

  // Sync thresholds to localStorage
  const handleThresholdChange = (key: keyof Thresholds, value: number) => {
    const updated = { ...thresholds, [key]: value };
    setThresholds(updated);
    localStorage.setItem("hardware_thresholds", JSON.stringify(updated));
  };

  // Safe refetch handler from Express system logs
  const fetchMetricsData = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/metrics`);
      if (!response.ok) throw new Error("Connection failed");
      const data = await response.json();
      setMetrics(data.metrics || []);
    } catch (error) {
      console.error("Failed fetching latest metric history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll metrics on mount
  useEffect(() => {
    fetchMetricsData();
    // Continuously check metrics database file for updates every 4 seconds
    const interval = setInterval(fetchMetricsData, 4000);
    return () => clearInterval(interval);
  }, [fetchMetricsData]);

  // Clean wipe database command
  const clearMetricsHistory = async () => {
    if (!window.confirm("Are you sure you want to completely clear the hardware metrics history?")) return;
    try {
      const response = await fetch(`${BASE_URL}/api/metrics`, { method: "DELETE" });
      if (response.ok) {
        setMetrics([]);
        alert("Telemetry file cleared successfully.");
      }
    } catch (e) {
      console.error("Error wiping metrics history csv:", e);
    }
  };

  // Core Simulation sequence post simulator activity values
  const triggerSimulationTelemetry = useCallback(async () => {
    // Generate organic temperature and load waves
    const timeFactor = Date.now() / 10000;
    const cpuLoadBase = 40 + Math.sin(timeFactor) * 25 + Math.random() * 10;
    const cpuLoad = Math.max(5, Math.min(99, Math.round(cpuLoadBase)));
    
    // CPU temp mirrors load with thermal accumulation offsets
    const cpuTemp = Math.round(
      42 + (cpuLoad * 0.44) + Math.cos(timeFactor * 0.8) * 3 + Math.random() * 2
    );

    const gpuLoadBase = 35 + Math.cos(timeFactor * 1.2) * 30 + Math.random() * 10;
    const gpuLoad = Math.max(2, Math.min(100, Math.round(gpuLoadBase)));
    
    // GPU thermal readings
    const gpuTemp = Math.round(
      45 + (gpuLoad * 0.38) + Math.sin(timeFactor * 0.5) * 4 + Math.random() * 2
    );

    const ramUsage = Math.max(
      20,
      Math.min(97, Math.round(45 + Math.sin(timeFactor * 0.4) * 15 + (cpuLoad * 0.2) + Math.random() * 4))
    );

    try {
      await fetch(`${BASE_URL}/api/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpuTemp,
          cpuLoad,
          gpuTemp,
          gpuLoad,
          ramUsage,
          source: "simulated",
        }),
      });
      fetchMetricsData();
    } catch (e) {
      console.error("Simulation endpoint unreachable:", e);
    }
  }, [fetchMetricsData]);

  // Dynamic simulation timer hook
  const simulatorTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isSimulating) {
      // Trigger immediately and then on interval
      triggerSimulationTelemetry();
      simulatorTimer.current = setInterval(triggerSimulationTelemetry, simulationSpeed * 1000);
    } else {
      if (simulatorTimer.current) {
        clearInterval(simulatorTimer.current);
      }
    }
    return () => {
      if (simulatorTimer.current) clearInterval(simulatorTimer.current);
    };
  }, [isSimulating, simulationSpeed, triggerSimulationTelemetry]);

  // Extract the absolute latest metrics entry safely
  const currentMetric: HardwareMetric | null = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  // Evaluate alarm states against currently active configurations
  const isCpuTempAlert = currentMetric ? currentMetric.cpuTemp >= thresholds.cpuTemp : false;
  const isCpuLoadAlert = currentMetric ? currentMetric.cpuLoad >= thresholds.cpuLoad : false;
  const isGpuTempAlert = currentMetric ? currentMetric.gpuTemp >= thresholds.gpuTemp : false;
  const isGpuLoadAlert = currentMetric ? currentMetric.gpuLoad >= thresholds.gpuLoad : false;
  const isRamAlert = currentMetric ? currentMetric.ramUsage >= thresholds.ramUsage : false;

  const systemWarmingAlert = isCpuTempAlert || isGpuTempAlert || isRamAlert;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans tracking-normal flex flex-col justify-between">
      {/* Top Warning Announcement Overlay when sensors breach thresholds */}
      {systemWarmingAlert && (
        <div className="bg-rose-600 text-white px-4 py-2 text-center text-xs font-bold tracking-wider flex items-center justify-center gap-2 animate-pulse shadow-sm shadow-rose-600/20">
          <AlertOctagon className="w-4.5 h-4.5 shrink-0" />
          SYSTEM THERMAL EXCEEDED CONFIGURED DANGER THRESHOLD! PERFORMANCE IS BEING PREEMPTIVELY THROTTLED
        </div>
      )}

      {/* Top Navigation Bar adhering to Professional Polish Design HTML */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800">SysLog Pro <span className="text-slate-400 font-light text-xs font-mono ml-1">v2.4</span></span>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Diagnostic Active Badge */}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
            <span className={`w-2 h-2 rounded-full ${systemWarmingAlert ? "bg-rose-500 animate-ping" : "bg-emerald-500"}`} />
            {systemWarmingAlert ? "Thermal Alert Triggered" : "System Healthy • Recording"}
          </div>
          
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider font-mono">Uptime Monitor</div>
            <div className="text-xs font-mono font-bold text-slate-700">ACTIVE SESSION ONLINE</div>
          </div>
        </div>
      </header>

      {/* Main Content Area split in left sidebar / right graphs */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar: Core Hardware Metrics & Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          
          {/* CPU Card */}
          <MetricCard
            id="cpu_metric_card"
            title="Central Processing"
            subLabel="8 Cores"
            value={currentMetric ? currentMetric.cpuTemp : 42.0}
            unit="°C"
            loadValue={currentMetric ? currentMetric.cpuLoad : 12}
            icon={Cpu}
            thresholdTemp={thresholds.cpuTemp}
            thresholdLoad={thresholds.cpuLoad}
            isTempExceeded={isCpuTempAlert}
            isLoadExceeded={isCpuLoadAlert}
            accentColor="rose"
          />

          {/* GPU Card */}
          <MetricCard
            id="gpu_metric_card"
            title="Graphics Processor"
            subLabel="RTX 4080"
            value={currentMetric ? currentMetric.gpuTemp : 45.0}
            unit="°C"
            loadValue={currentMetric ? currentMetric.gpuLoad : 8}
            icon={Zap}
            thresholdTemp={thresholds.gpuTemp}
            thresholdLoad={thresholds.gpuLoad}
            isTempExceeded={isGpuTempAlert}
            isLoadExceeded={isGpuLoadAlert}
            accentColor="indigo"
          />

          {/* Core Memory Card */}
          <MetricCard
            id="ram_metric_card"
            title="SRAM Space Cache"
            subLabel="DDR5 Space"
            value={currentMetric ? (currentMetric.ramUsage * 0.16) : 3.8}
            unit="GB"
            loadValue={currentMetric ? currentMetric.ramUsage : 24}
            icon={Database}
            thresholdTemp={95}
            thresholdLoad={thresholds.ramUsage}
            isTempExceeded={false}
            isLoadExceeded={isRamAlert}
            accentColor="teal"
          />

          {/* Logging Session controller box styled with the signature dark background */}
          <div className="bg-slate-900 rounded-xl p-5 text-white shadow-md flex-1 flex flex-col justify-between gap-4 text-left">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Telemetry Log Settings</h3>
              
              <div className="space-y-3 font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Primary Data File</div>
                  <div className="text-xs text-indigo-300 truncate">metrics_history.csv</div>
                </div>
                
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Acquired Entries</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {metrics.length}{" "}
                    <span className="text-xs font-normal text-slate-400 font-sans">recorded readings</span>
                  </div>
                </div>

                {/* Simulation Control Switch inside sidebar */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Hardware Simulator:</span>
                    <button
                      onClick={() => setIsSimulating(!isSimulating)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-all ${
                        isSimulating
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {isSimulating ? "Live Running" : "Standby"}
                    </button>
                  </div>
                  {isSimulating && (
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className="text-[9px] text-slate-500">Interval Speed:</span>
                      <select
                        value={simulationSpeed}
                        onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                        className="bg-slate-800 text-slate-200 text-[10px] rounded px-1.5 py-0.5 border border-slate-700 font-sans cursor-pointer"
                      >
                        <option value="1">1s Peak</option>
                        <option value="3">3s Normal</option>
                        <option value="5">5s Eco</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick-action Export CSV & Wipe buttons inside design block */}
            <div className="mt-2 space-y-2">
              <a
                href={`${BASE_URL}/api/export-csv`}
                className="w-full bg-white text-slate-900 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV Logs
              </a>
              
              <button
                onClick={clearMetricsHistory}
                className="w-full bg-slate-800 hover:bg-slate-700 hover:text-rose-400 text-slate-400 font-semibold py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear Telemetry Data
              </button>
            </div>
          </div>

        </div>

        {/* Center/Right Main Section: Trends, AI analysis, alarms */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Dynamic App Tab Toggle Header */}
          <div className="flex bg-slate-200/60 p-1 rounded-xl self-start w-full sm:w-auto">
            <button
              onClick={() => setActiveSubTab("charts")}
              className={`flex-1 sm:flex-initial flex items-center gap-1.5 justify-center px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeSubTab === "charts"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              Trend Timelines
            </button>
            <button
              onClick={() => setActiveSubTab("ai")}
              className={`flex-1 sm:flex-initial flex items-center gap-1.5 justify-center px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeSubTab === "ai"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Gemini AI Advisor
            </button>
            <button
              onClick={() => setActiveSubTab("remote")}
              className={`flex-1 sm:flex-initial flex items-center gap-1.5 justify-center px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeSubTab === "remote"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Host Connection Scripts
            </button>
          </div>

          {/* Subpanel Content body render */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs overflow-hidden">
            {activeSubTab === "charts" && (
              <TrendCharts id="hardware_history_timeline" data={metrics} />
            )}
            
            {activeSubTab === "ai" && (
              <AdvicePanel
                id="gemini_advisor_segment"
                thresholds={thresholds}
                onRefreshTrigger={fetchMetricsData}
              />
            )}
            
            {activeSubTab === "remote" && (
              <InstructionPanel id="real_collector_instructions" />
            )}
          </div>

          {/* Alarms Threshold sliders box matching system layout */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-left">
            <div className="flex items-center gap-1.5 mb-3 border-b border-slate-50 pb-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">母亲板 Warn Alerts Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CPU slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1.5 font-semibold text-slate-600 font-sans">
                  <span>CPU Temperature Alert Limit</span>
                  <span className="text-blue-600 font-mono text-xs">{thresholds.cpuTemp}°C</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={thresholds.cpuTemp}
                  onChange={(e) => handleThresholdChange("cpuTemp", parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* GPU slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1.5 font-semibold text-slate-600 font-sans">
                  <span>GPU Temperature Alert Limit</span>
                  <span className="text-emerald-600 font-mono text-xs">{thresholds.gpuTemp}°C</span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="95"
                  value={thresholds.gpuTemp}
                  onChange={(e) => handleThresholdChange("gpuTemp", parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Memory strain slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1.5 font-semibold text-slate-600 font-sans">
                  <span>RAM Memory Cap Alert Limit</span>
                  <span className="text-purple-600 font-mono text-xs">{thresholds.ramUsage}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="98"
                  value={thresholds.ramUsage}
                  onChange={(e) => handleThresholdChange("ramUsage", parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Bottom Control Bar aligned to Design HTML specifications */}
      <footer className="h-12 bg-slate-100 border-t border-slate-200 px-6 sm:px-8 flex items-center justify-between text-[11px] font-medium text-slate-500 shrink-0 select-none">
        <div className="flex gap-4 sm:gap-6">
          <span>Log File Path: <strong className="font-mono text-slate-700">./metrics_history.csv</strong></span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline">Active Sampling Period: <strong className="text-slate-700 font-mono">4000ms</strong></span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
            Node ID: WORKSTATION-01
          </span>
          <span className="text-slate-300">|</span>
          <span>License: Enterprise Professional Edition</span>
        </div>
      </footer>
    </div>
  );
}
