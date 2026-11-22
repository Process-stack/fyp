import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import analysisRoutes from "./routes/analysisRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(Object.assign(new Error("Origin is not allowed by CORS."), { status: 403 }));
      }
    })
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 120,
      standardHeaders: "draft-7",
      legacyHeaders: false
    })
  );
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: req.app.locals.databaseReady ? "connected" : "disconnected" });
  });
  app.use("/api/analyses", analysisRoutes);
  app.use((req, res) => res.status(404).json({ error: "Endpoint was not found." }));
  app.use(errorHandler);
  return app;
}
