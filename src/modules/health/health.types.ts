export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  database: {
    connected: boolean;
    latencyMs: number | null;
  };
  api: {
    version: string;
  };
}
