export interface HardwareMetric {
  id: string;
  timestamp: string; // ISO String
  cpuTemp: number; // °C
  cpuLoad: number; // %
  gpuTemp: number; // °C
  gpuLoad: number; // %
  ramUsage: number; // %
  source: 'simulated' | 'external';
}

export interface Thresholds {
  cpuTemp: number;
  cpuLoad: number;
  gpuTemp: number;
  gpuLoad: number;
  ramUsage: number;
}

export interface SystemAnalysis {
  status: 'optimal' | 'warning' | 'critical';
  cpuSummary: string;
  gpuSummary: string;
  ramSummary: string;
  recommendations: string[];
  geminiAdvised?: boolean;
}
