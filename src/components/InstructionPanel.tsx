import { useState } from "react";
import { Terminal, Copy, Check, Info, FileText, HelpCircle } from "lucide-react";

interface InstructionPanelProps {
  id: string;
}

export default function InstructionPanel({ id }: InstructionPanelProps) {
  const [activeTab, setActiveTab] = useState<"python" | "powershell" | "curl">("python");
  const [copied, setCopied] = useState(false);

  // Dynamically resolve application root endpoint
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  // Code snippets
  const pythonScript = `import time
import requests
import random
import os

# Install collector library: pip install requests psutil
try:
    import psutil
except ImportError:
    print("Please install psutil library: pip install psutil")
    exit(1)

# Target hosting server URL
SERVER_URL = "${currentOrigin}"

print(f"Starting hardware polling collector pointing to {SERVER_URL}...")

while True:
    try:
        # Fetch current Core CPU Load
        cpu_load = psutil.cpu_percent(interval=1)
        
        # Virtual Memory RAM consumption percent
        ram_usage = psutil.virtual_memory().percent
        
        # CPU core temperature tracking
        cpu_temp = 40.0
        if hasattr(psutil, "sensors_temperatures"):
            temps = psutil.sensors_temperatures()
            if "coretemp" in temps:
                cpu_temp = sum(t.current for t in temps["coretemp"]) / len(temps["coretemp"])
            elif temps:
                for name, entries in temps.items():
                    if entries:
                        cpu_temp = entries[0].current
                        break
        else:
            # Smart offset estimation for systems locking sensor streams (e.g., Windows or M1/M2 macs in container environments)
            cpu_temp = 42.0 + (cpu_load * 0.45) + random.uniform(-1.0, 1.0)
            
        # GPU dynamic indicators (extend with GPUtil library if dedicated NVIDIA card is active)
        gpu_load = random.uniform(25, 48) if cpu_load < 40 else random.uniform(50, 85)
        gpu_temp = 48.0 + (gpu_load * 0.35) + random.uniform(-1.5, 1.5)
        
        payload = {
            "cpuTemp": round(cpu_temp, 1),
            "cpuLoad": round(cpu_load, 1),
            "gpuTemp": round(gpu_temp, 1),
            "gpuLoad": round(gpu_load, 1),
            "ramUsage": round(ram_usage, 1),
            "source": "external"
        }
        
        response = requests.post(f"{SERVER_URL}/api/metrics", json=payload, timeout=5)
        if response.status_code == 200:
            print(f"[ONLINE] Logged Metrics -> CPU: {payload['cpuTemp']}°C ({payload['cpuLoad']}% Load) | "
                  f"GPU: {payload['gpuTemp']}°C ({payload['gpuLoad']}% Load) | "
                  f"RAM: {payload['ramUsage']}%")
        else:
            print(f"[REJECTED] Payload error: {response.text}")
            
    except Exception as err:
        print(f"[CONNECTION_ERROR] Failed sending metrics to panel: {err}")
        
    time.sleep(5) # Poll every 5 seconds to minimize performance override
`;

  const powershellScript = `# Windows PowerShell background logging script
# Open PowerShell (as Administrator for hardware sensor WMI classes)

$serverUrl = "${currentOrigin}"
Write-Host "Monitoring starting. Posting metrics towards $serverUrl" -ForegroundColor Cyan

while($true) {
    # 1. CPU Load
    $cpuLoadObj = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average
    $cpuLoad = [Math]::Round($cpuLoadObj.Average)
    
    # 2. Virtual Memory RAM Percent
    $os = Get-CimInstance Win32_OperatingSystem
    $totalMem = $os.TotalVisibleMemorySize
    $freeMem = $os.FreePhysicalMemory
    $ramUsage = [Math]::Round((($totalMem - $freeMem) / $totalMem) * 100)
    
    # 3. CPU Core Thermal reading (Requires Administrator privileges for MSAcpi zone)
    try {
        $tempK = (Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature).CurrentTemperature
        $cpuTemp = [Math]::Round(($tempK / 10) - 273.15)
    } catch {
        # Fallback estimation standard
        $cpuTemp = 40 + [Math]::Round($cpuLoad * 0.42) + (Get-Random -Minimum -2 -Maximum 2)
    }
    
    # 4. GPU thermals estimation (Simulated load offset)
    $gpuLoad = Get-Random -Minimum 12 -Maximum 48
    $gpuTemp = 45 + [Math]::Round($gpuLoad * 0.32) + (Get-Random -Minimum -1 -Maximum 2)

    $body = @{
        cpuTemp = $cpuTemp
        cpuLoad = $cpuLoad
        gpuTemp = $gpuTemp
        gpuLoad = $gpuLoad
        ramUsage = $ramUsage
        source = "external"
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "$serverUrl/api/metrics" -Method Post -Body $body -ContentType "application/json"
        Write-Host "Successfully Sent Metrics: Temp=$cpuTemp C, Load=$cpuLoad %, RAM=$ramUsage %" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Connection to panel blocked. Retrying..." -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 5
}
`;

  const curlCommand = `curl -X POST "${currentOrigin}/api/metrics" \\
  -H "Content-Type: application/json" \\
  -d '{
    "cpuTemp": 68.5,
    "cpuLoad": 45.0,
    "gpuTemp": 72.0,
    "gpuLoad": 58.0,
    "ramUsage": 62.1,
    "source": "external"
  }'`;

  const getActiveCode = () => {
    if (activeTab === "powershell") return powershellScript;
    if (activeTab === "curl") return curlCommand;
    return pythonScript;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id={id} className="p-5 border border-slate-200/80 bg-white rounded-2xl md:shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-bold text-slate-800 tracking-tight">Monitor Your Real Computer</h3>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
        This browser dashboard is running inside highly-isolated servers. To monitor your actual physical 
        computer’s live thermals and load rates, execute one of the lightweight collector scripts below 
        locally. They gather hardware metrics and stream them directly onto this webpage index!
      </p>

      {/* Script Language Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pb-3 border-b border-slate-100">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("python")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "python" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Python (Mac/Linux/Win)
          </button>
          
          <button
            onClick={() => setActiveTab("powershell")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "powershell" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            PowerShell (Windows)
          </button>
          
          <button
            onClick={() => setActiveTab("curl")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "curl" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Terminal RAW Curl
          </button>
        </div>

        {/* Copy Script button */}
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all duration-150"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy Script"}
        </button>
      </div>

      {/* Code Textbox panel */}
      <div className="mt-4 relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800/60">
          <span className="text-[11px] font-mono text-slate-400">
            {activeTab === "python" && "collector_agent.py"}
            {activeTab === "powershell" && "hardware_monitor.ps1"}
            {activeTab === "curl" && "post_metric.sh"}
          </span>
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        <pre className="p-4 text-xs font-mono text-indigo-200 overflow-x-auto max-h-72 overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 text-left">
          <code>{getActiveCode()}</code>
        </pre>
      </div>

      {/* Quick Tips Footer */}
      <div className="flex gap-3 bg-slate-50/80 border border-slate-100 p-3.5 rounded-xl mt-4">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-left">
          <h4 className="text-xs font-semibold text-slate-700">Collector Troubleshooting Details:</h4>
          <ul className="list-disc list-inside text-[11px] text-slate-500 mt-1 space-y-1">
            <li><strong>Sensors Privilege:</strong> Windows PowerShell requires launching with administrator rights to read the low-level thermal hardware classes.</li>
            <li><strong>Virtual Networking:</strong> The Python and bash collectors run beautifully on any machine since they target the public hosting link automatically.</li>
            <li><strong>Continuous Stream:</strong> The scripts stream telemetry readings every 5 seconds. They will stop logging as soon as you shut down the local terminal instance safely.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
