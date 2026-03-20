import path from "path";
import express from "express";
import apiRoutes from "./routes/api";
import { state } from "../shared/state";

const FRONTEND_DIR = path.join(__dirname, "../../frontend/dist");

function getSecret(): string {
  return state.config.dashboardSecret || process.env.DASHBOARD_SECRET || "";
}

export function createServer(): express.Application {
  const app = express();
  app.use(express.json());

  const sessions = new Set<string>();

  app.post("/api/login", (req, res) => {
    const secret = getSecret();
    if (!secret || secret === "changeme") return res.json({ ok: true });
    if (req.body.password === secret) {
      const sessionId = Math.random().toString(36).slice(2);
      sessions.add(sessionId);
      res.cookie("sid", sessionId, { httpOnly: true, maxAge: 86400000 });
      return res.json({ ok: true });
    }
    res.status(401).json({ error: "wrong password" });
  });

  app.use("/api", (req, res, next) => {
    const secret = getSecret();
    if (!secret || secret === "changeme") return next();
    // Public chat endpoints - no auth required
    if (req.path.startsWith("/chat/characters") || req.path.startsWith("/chat/send")) {
      return next();
    }
    const cookieHeader = req.headers.cookie || "";
    const sidMatch = cookieHeader.match(/sid=([^;]+)/);
    if (sidMatch && sessions.has(sidMatch[1])) return next();
    if (req.headers.authorization === secret) return next();
    res.status(401).json({ error: "unauthorized" });
  });

  app.use("/api", apiRoutes);
  app.use(express.static(FRONTEND_DIR));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, "index.html"));
  });

  return app;
}
