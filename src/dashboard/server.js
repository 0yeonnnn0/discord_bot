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
    app.use(express.urlencoded({ extended: false }));

    // 로그인 페이지
    app.get("/login", (req, res) => {
      const error = req.query.error ? "비밀번호가 틀렸다냥 냥냥펀치!!" : "";
      res.send(`<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Discord Bot - 로그인</title>
<link rel="stylesheet" href="/style.css">
<style>
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:80vh}
.login-box{background:#16213e;padding:2rem;border-radius:12px;border:1px solid #2a2a4a;width:320px;text-align:center}
.login-box h2{margin-bottom:1.5rem;color:#7289da}
.login-box input{width:100%;padding:0.7rem;border-radius:6px;border:1px solid #2a2a4a;background:#1a1a2e;color:#e0e0e0;font-size:1rem;margin-bottom:1rem;box-sizing:border-box}
.login-box input:focus{outline:none;border-color:#7289da}
.error{color:#f04747;font-size:0.85rem;margin-bottom:1rem}
</style></head><body>
<nav><div class="nav-brand">Discord Bot</div></nav>
<main><div class="login-wrap"><div class="login-box">
<h2>=^0w0^=</h2>
${error ? `<p class="error">${error}</p>` : ""}
<form method="POST" action="/login">
<input type="password" name="password" placeholder="비밀번호" autofocus>
<button class="btn" style="width:100%">들어가기</button>
</form></div></div></main></body></html>`);
    });

    // 로그인 처리
    app.post("/login", (req, res) => {
      if (req.body.password === secret) {
        const sessionId = Math.random().toString(36).slice(2);
        sessions.add(sessionId);
        res.cookie("sid", sessionId, { httpOnly: true, maxAge: 86400000 });
        return res.redirect("/");
      }
      res.redirect("/login?error=1");
    });

    // 인증 체크
    app.use((req, res, next) => {
      const cookieHeader = req.headers.cookie || "";
      const sidMatch = cookieHeader.match(/sid=([^;]+)/);
      if (sidMatch && sessions.has(sidMatch[1])) {
        return next();
      }
      if (req.headers.authorization === secret) {
        return next();
      }
      res.redirect("/login");
    });
  }

  app.use("/api", apiRoutes);
  app.use("/", pageRoutes);

  return app;
}

module.exports = { createServer };
