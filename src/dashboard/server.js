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
  if (secret && secret !== "changeme") {
    app.use((req, res, next) => {
      // 쿠키 또는 쿼리로 인증
      const token =
        req.query.token || req.headers.authorization || req.cookies?.token;
      if (token === secret) {
        // 인증 성공 시 쿠키 설정
        if (req.query.token) {
          res.cookie("token", secret, { httpOnly: true, maxAge: 86400000 });
          return res.redirect(req.path);
        }
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
