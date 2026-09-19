import http from "k6/http";
import { check, sleep } from "k6";

// Smoke: every service health endpoint. Run: k6 run load-tests/smoke.js
export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const GATEWAY = __ENV.GATEWAY_URL || "http://localhost:8080";

const TARGETS = [
  `${GATEWAY}/health`,
  "http://localhost:3000/health",
  "http://localhost:3001/health",
  "http://localhost:3002/health",
  "http://localhost:3003/health",
  "http://localhost:3004/health",
  "http://localhost:3005/health",
];

export default function () {
  for (const url of TARGETS) {
    const res = http.get(url);
    check(res, { [`${url} -> 200`]: (r) => r.status === 200 });
  }
  sleep(1);
}
