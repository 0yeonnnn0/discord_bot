const path = require("path");
const express = require("express");
const apiRoutes = require("./routes/api");
const pageRoutes = require("./routes/pages");

function createServer() {
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "../../public")));

  // 간단한 인증 미들웨어
  const secret = process.env.DASHBOARD_SECRET;
  const sessions = new Set();
  if (secret && secret !== "changeme") {
    app.use((req, res, next) => {
      // 1. 쿼리 토큰으로 인증
      if (req.query.token === secret) {
        const sessionId = Math.random().toString(36).slice(2);
        sessions.add(sessionId);
        res.cookie("sid", sessionId, { httpOnly: true, maxAge: 86400000 });
        return res.redirect(req.path);
      }

      // 2. 쿠키 세션으로 인증
      const cookieHeader = req.headers.cookie || "";
      const sidMatch = cookieHeader.match(/sid=([^;]+)/);
      if (sidMatch && sessions.has(sidMatch[1])) {
        return next();
      }

      // 3. Authorization 헤더
      if (req.headers.authorization === secret) {
        return next();
      }

      res.status(401).send("Unauthorized - ?token=YOUR_SECRET 으로 접속하세요");
    });
  }

  app.use("/api", apiRoutes);
  app.use("/", pageRoutes);

  return app;
}

module.exports = { createServer };
