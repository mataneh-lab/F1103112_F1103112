import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;
const CSV_FILE = path.join(process.cwd(), "metrics_history.csv");

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.use(express.json());

// Helper function to read metrics from CSV safely
function getMetricsFromCSV(): any[] {
  if (!fs.existsSync(CSV_FILE)) {
    return [];
  }
  try {
    const content = fs.readFileSync(CSV_FILE, "utf-8");
    const lines = content.split("\n").filter(line => line.trim() !== "");
    if (lines.length <= 1) return []; // Only header
    
    const headers = lines[0].split(",");
    const list: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length < headers.length) continue;
      
      const item: any = {};
      headers.forEach((h, idx) => {
        const val = parts[idx].trim();
        // Parse numerical columns
        if (["cpuTemp", "cpuLoad", "gpuTemp", "gpuLoad", "ramUsage"].includes(h)) {
          item[h] = parseFloat(val) || 0;
        } else {
          item[h] = val;
        }
      });
      list.push(item);
    }
    return list;
  } catch (error) {
    console.error("Error reading CSV file:", error);
    return [];
  }
}

// Helper function to append a metric to CSV safely
function appendMetricToCSV(metric: any) {
  const headers = ["id", "timestamp", "cpuTemp", "cpuLoad", "gpuTemp", "gpuLoad", "ramUsage", "source"];
  const isNew = !fs.existsSync(CSV_FILE);
  
  try {
    const row = headers.map(h => metric[h] !== undefined ? String(metric[h]).replace(/,/g, " ") : "").join(",");
    if (isNew) {
      fs.writeFileSync(CSV_FILE, headers.join(",") + "\n" + row + "\n", "utf-8");
    } else {
      fs.appendFileSync(CSV_FILE, row + "\n", "utf-8");
    }
  } catch (error) {
    console.error("Error writing to CSV file:", error);
  }
}

// Seed historical metrics if the CSV is empty, giving the user immediate visual graphs
function seedHistoricalCSV() {
  if (fs.existsSync(CSV_FILE)) {
    // If it exists but is empty, or only contains header, seed it
    const list = getMetricsFromCSV();
    if (list.length > 0) return;
  }

  console.log("Seeding metrics CSV with 24 hours of simulated historic data...");
  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  
  // Seed 24 data points representing the past 24 hours
  for (let i = 24; i >= 1; i--) {
    const timestamp = new Date(now - i * oneHourMs).toISOString();
    // Create typical fluctuations (daily load patterns)
    const hourOfDay = new Date(now - i * oneHourMs).getHours();
    const isWorkingHours = hourOfDay >= 9 && hourOfDay <= 18;
    const isPeakGaming = hourOfDay >= 20 && hourOfDay <= 23;

    let baseLoad = 15;
    if (isWorkingHours) baseLoad = 40;
    if (isPeakGaming) baseLoad = 75;

    const cpuLoad = Math.max(5, Math.min(98, Math.round(baseLoad + (Math.random() * 15 - 7))));
    const cpuTemp = Math.round(35 + (cpuLoad * 0.4) + (Math.random() * 4 - 2));
    
    const gpuLoad = Math.max(2, Math.min(100, Math.round((isPeakGaming ? 80 : 10) + (Math.random() * 12 - 6))));
    const gpuTemp = Math.round(38 + (gpuLoad * 0.35) + (Math.random() * 4 - 2));
    
    const ramUsage = Math.max(20, Math.min(95, Math.round(30 + (cpuLoad * 0.25) + (Math.random() * 10 - 5))));

    const mockItem = {
      id: `seed_${24 - i}`,
      timestamp,
      cpuTemp,
      cpuLoad,
      gpuTemp,
      gpuLoad,
      ramUsage,
      source: "simulated"
    };
    appendMetricToCSV(mockItem);
  }
}

// Seed on startup
seedHistoricalCSV();

// API ROUTES

// 1. GET Metrics History
app.get("/api/metrics", (req, res) => {
  const list = getMetricsFromCSV();
  res.json({ metrics: list });
});

// 2. POST log metrics
app.post("/api/metrics", (req, res) => {
  const { cpuTemp, cpuLoad, gpuTemp, gpuLoad, ramUsage, source } = req.body;
  
  if (cpuTemp === undefined || cpuLoad === undefined || gpuTemp === undefined || gpuLoad === undefined || ramUsage === undefined) {
    res.status(400).json({ error: "Missing required metric values" });
    return;
  }

  const metric = {
    id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    cpuTemp: parseFloat(cpuTemp),
    cpuLoad: parseFloat(cpuLoad),
    gpuTemp: parseFloat(gpuTemp),
    gpuLoad: parseFloat(gpuLoad),
    ramUsage: parseFloat(ramUsage),
    source: source || "external"
  };

  appendMetricToCSV(metric);
  res.json({ success: true, metric });
});

// 3. DELETE Metrics History
app.delete("/api/metrics", (req, res) => {
  try {
    if (fs.existsSync(CSV_FILE)) {
      // Re-initialize with just headers
      const headers = ["id", "timestamp", "cpuTemp", "cpuLoad", "gpuTemp", "gpuLoad", "ramUsage", "source"];
      fs.writeFileSync(CSV_FILE, headers.join(",") + "\n", "utf-8");
    }
    res.json({ success: true, message: "Cleared hardware log history successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to clear metrics local file" });
  }
});

// 4. GET export CSV download
app.get("/api/export-csv", (req, res) => {
  if (!fs.existsSync(CSV_FILE)) {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=hardware_metrics_empty.csv");
    res.send("id,timestamp,cpuTemp,cpuLoad,gpuTemp,gpuLoad,ramUsage,source\n");
    return;
  }
  try {
    const csvContent = fs.readFileSync(CSV_FILE, "utf-8");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=hardware_metrics_history.csv");
    res.send(csvContent);
  } catch (error) {
    res.status(500).send("Error generating CSV export");
  }
});

// 4.5. GET Download Py Agent Client Script
app.get("/api/download-agent", (req, res) => {
  const agentPath = path.join(process.cwd(), "hardware_collector.py");
  if (!fs.existsSync(agentPath)) {
    res.status(404).json({ error: "Collector client script was not found on server." });
    return;
  }
  try {
    const fileContent = fs.readFileSync(agentPath, "utf-8");
    res.setHeader("Content-Type", "text/x-python");
    res.setHeader("Content-Disposition", "attachment; filename=hardware_collector.py");
    res.send(fileContent);
  } catch (error) {
    res.status(500).send("Error downloading python collector agent script.");
  }
});

// 5. POST Optimize System Hardware Performance with Gemini
app.post("/api/optimize-advice", async (req, res) => {
  try {
    const list = getMetricsFromCSV();
    if (list.length === 0) {
      res.json({
        status: "optimal",
        cpuSummary: "No metric log data found to analyze.",
        gpuSummary: "Please capture or simulate metrics first.",
        ramSummary: "No RAM metrics logged.",
        recommendations: [
          "Connect a local system collector script or start Simulation Mode to gather computer data.",
          "Check temperature threshold alarms in dashboard settings."
        ],
        geminiAdvised: false
      });
      return;
    }

    // Limit log context size for the prompt
    const recentMetrics = list.slice(-30);
    const avgCpuTemp = recentMetrics.reduce((sum, m) => sum + m.cpuTemp, 0) / recentMetrics.length;
    const maxCpuTemp = Math.max(...recentMetrics.map(m => m.cpuTemp));
    const avgCpuLoad = recentMetrics.reduce((sum, m) => sum + m.cpuLoad, 0) / recentMetrics.length;
    
    const avgGpuTemp = recentMetrics.reduce((sum, m) => sum + m.gpuTemp, 0) / recentMetrics.length;
    const maxGpuTemp = Math.max(...recentMetrics.map(m => m.gpuTemp));
    const avgGpuLoad = recentMetrics.reduce((sum, m) => sum + m.gpuLoad, 0) / recentMetrics.length;
    
    const avgRam = recentMetrics.reduce((sum, m) => sum + m.ramUsage, 0) / recentMetrics.length;
    const maxRam = Math.max(...recentMetrics.map(m => m.ramUsage));

    // Thresholds configured in request
    const thresholdInput = req.body.thresholds || { cpuTemp: 75, gpuTemp: 80, ramUsage: 85 };

    const prompt = `You are an elite PC performance customization and mechanical cooling engineer. 
Analyze the following hardware hardware logs from a user's computer and provide technical optimization suggestions to improve speed, lower temperatures, and eliminate bottlenecks. 

### LOG STATS OVER RECENT CONTEXT (30 readings):
- CPU Temperature: Avg ${avgCpuTemp.toFixed(1)}°C, Peak ${maxCpuTemp}°C (Threshold Limit: ${thresholdInput.cpuTemp}°C)
- CPU Load Capacity: Avg ${avgCpuLoad.toFixed(1)}%
- GPU Temperature: Avg ${avgGpuTemp.toFixed(1)}°C, Peak ${maxGpuTemp}°C (Threshold Limit: ${thresholdInput.gpuTemp}°C)
- GPU Load Capacity: Avg ${avgGpuLoad.toFixed(1)}%
- Memory Usage (RAM): Avg ${avgRam.toFixed(1)}%, Peak ${maxRam}% (Threshold Limit: ${thresholdInput.ramUsage}°C)

### CORE TEMPERATURE & PRESSURE WARNINGS TRIGGERED:
- CPU High-Thermal Warnings: ${recentMetrics.filter(m => m.cpuTemp > thresholdInput.cpuTemp).length} occurrences.
- GPU High-Thermal Warnings: ${recentMetrics.filter(m => m.gpuTemp > thresholdInput.gpuTemp).length} occurrences.
- High Memory Caps: ${recentMetrics.filter(m => m.ramUsage > thresholdInput.ramUsage).length} occurrences.

Provide a high-quality JSON response matching the following structure perfectly. Return ONLY the JSON object and no surrounding conversational formatting or markdown block ticks so it can be parsed directly.

{
  "status": "optimal" | "warning" | "critical" (evaluate based on peak temps and occurrences),
  "cpuSummary": "Clear 1-2 sentence assessment of CPU thermals and load behavior",
  "gpuSummary": "Clear 1-2 sentence assessment of GPU thermals and load behavior",
  "ramSummary": "Clear 1-2 sentence assessment of RAM memory bottlenecks",
  "recommendations": [
    "List 4 to 5 highly tactical, actionable PC performance optimization tips (e.g. adjust fan curves in MSI Afterburner, check thermal paste, adjust Windows power plan, identify specific background tasks, hardware upgrades, etc.)"
  ]
}`;

    // Query Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const adviceText = response.text || "";
    try {
      const parsedAdvice = JSON.parse(adviceText.trim());
      parsedAdvice.geminiAdvised = true;
      res.json(parsedAdvice);
    } catch (parseError) {
      console.error("Gemini output parsing failed, falling back.", adviceText);
      // Fallback response if JSON parsing went wrong
      res.json({
        status: maxCpuTemp > thresholdInput.cpuTemp || maxGpuTemp > thresholdInput.gpuTemp ? "warning" : "optimal",
        cpuSummary: `CPU averaged ${avgCpuTemp.toFixed(1)}°C with loads near ${avgCpuLoad.toFixed(1)}%.`,
        gpuSummary: `GPU thermals peaked at ${maxGpuTemp}°C on ${avgGpuLoad.toFixed(1)}% load.`,
        ramSummary: `RAM utilization peaked at ${maxRam}%.`,
        recommendations: [
          "Thermal spikes detected: evaluate PC case air intake path and fan orientation.",
          "Check Windows task manager for processes capping high hardware load cycles.",
          "Enable Eco/Quiet modes if silent acoustic gaming is preferred over premium raw rendering cycles.",
          "Validate CPU hardware mounting and thermal pads contact if spikes persist."
        ],
        geminiAdvised: false
      });
    }

  } catch (error: any) {
    console.error("Gemini core API error:", error);
    res.status(500).json({ error: "Gemini server failed to respond or key is inactive." });
  }
});


// Serve static assets & build files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite Middlewares for local hot reloading
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets from /dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hardware Server listening closely on http://0.0.0.0:${PORT}`);
  });
}

startServer();
