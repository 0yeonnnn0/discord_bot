const path = require("path");
const express = require("express");
const apiRoutes = require("./routes/api");

const FRONTEND_DIR = path.join(__dirname, "../../frontend/dist");

function createServer() {
  const app = express();

  app.use(express.json());

  // 인증
  const secret = process.env.DASHBOARD_SECRET;
  const sessions = new Set();

  if (secret && secret !== "changeme") {
    // 로그인 API (인증 전에 접근 가능)
    app.post("/api/login", (req, res) => {
      if (req.body.password === secret) {
        const sessionId = Math.random().toString(36).slice(2);
        sessions.add(sessionId);
        res.cookie("sid", sessionId, { httpOnly: true, maxAge: 86400000 });
        return res.json({ ok: true });
      }
      res.status(401).json({ error: "wrong password" });
    });

    // 인증 체크 (API 라우트에만 적용)
    app.use("/api", (req, res, next) => {
      const cookieHeader = req.headers.cookie || "";
      const sidMatch = cookieHeader.match(/sid=([^;]+)/);
      if (sidMatch && sessions.has(sidMatch[1])) return next();
      if (req.headers.authorization === secret) return next();
      res.status(401).json({ error: "unauthorized" });
    });
  }

  app.use("/api", apiRoutes);

  // React 정적 파일 서빙
  app.use(express.static(FRONTEND_DIR));

  // SPA fallback: 모든 라우트를 index.html로
  app.get("*", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, "index.html"));
  });

  return app;
}

module.exports = { createServer };
