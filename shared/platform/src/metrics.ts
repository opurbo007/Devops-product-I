import client from "prom-client";

// Minimal structural types so this package stays express-free (services pass
// their real req/res/next, which satisfy these shapes).
interface MetricsRequest {
  method: string;
  path: string;
}

interface MetricsResponse {
  statusCode: number;
  on(event: "finish", cb: () => void): void;
}

type MetricsNext = () => void;

// Prometheus metrics shared by every HTTP service. Each process owns its
// registry (default Node process metrics + one HTTP latency histogram).
// Services mount: app.use(metricsMiddleware("<service>")) and expose
// GET /metrics (before auth — Prometheus scrapes it directly).
export const registry = new client.Registry();

client.collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency in seconds",
  labelNames: ["service", "method", "route", "status"],
  registers: [registry],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

function normalizeRoute(path: string): string {
  return path
    .replace(/\/[0-9a-fA-F-]{36}/g, "/:id")
    .replace(/\/\d+/g, "/:n");
}

export function metricsMiddleware(service: string) {
  return function metrics(
    req: MetricsRequest,
    res: MetricsResponse,
    next: MetricsNext,
  ): void {
    const end = httpRequestDuration.startTimer({
      service,
      method: req.method,
      route: normalizeRoute(req.path),
    });
    res.on("finish", () => {
      end({ status: String(res.statusCode) });
    });
    next();
  };
}

export async function metricsBody(): Promise<{
  contentType: string;
  body: string;
}> {
  return {
    contentType: registry.contentType,
    body: await registry.metrics(),
  };
}
