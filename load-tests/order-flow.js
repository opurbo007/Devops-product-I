import http from "k6/http";
import { check, sleep } from "k6";

// Full order flow through the gateway: register -> login -> create order ->
// poll saga status. Validates autoscaling under ramp. Run:
//   k6 run load-tests/order-flow.js
export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

const GATEWAY = __ENV.GATEWAY_URL || "http://localhost:8080";

export default function () {
  const email = `k6-${__VU}-${__ITER}@example.com`;
  const password = "loadtest-password-1";

  let res = http.post(
    `${GATEWAY}/auth/register`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(res, { "register 201|409": (r) => r.status === 201 || r.status === 409 });

  res = http.post(
    `${GATEWAY}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );
  const loggedIn = check(res, { "login 200": (r) => r.status === 200 });
  if (!loggedIn) return;
  const token = res.json("accessToken");

  const order = {
    customerId: res.json("user.id"),
    total: 49.99,
    items: [{ sku: "SKU-TSHIRT-BLK-M", qty: 1 }],
  };
  res = http.post(`${GATEWAY}/api/orders`, JSON.stringify(order), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const created = check(res, { "order 201": (r) => r.status === 201 });
  if (!created) return;
  const orderId = res.json("id");

  for (let i = 0; i < 6; i++) {
    sleep(2);
    const poll = http.get(`${GATEWAY}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (poll.status !== 200) continue;
    const status = poll.json("status");
    check(poll, { [`saga reached ${status}`]: () => true });
    if (status === "shipped" || status === "failed") break;
  }
}
