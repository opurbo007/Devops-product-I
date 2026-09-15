import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./auth/routes.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { proxyToService } from "./proxy.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 8080);
const orderServiceUrl = process.env.ORDER_SERVICE_URL ?? "http://localhost:3000";

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", express.json(), authRoutes);

app.use("/api", requireAuth, proxyToService(orderServiceUrl, "/api"));

app.use((_req, res) => {
  res.status(404).json({ error: { message: "Not found" } });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err instanceof SyntaxError ? 400 : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  console.error(err);
  res.status(status).json({ error: { message } });
});

app.listen(port, () => {
  console.log(`api-gateway listening on port ${port}`);
});
