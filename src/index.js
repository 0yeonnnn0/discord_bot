require("dotenv").config();

const { start: startBot } = require("./bot/client");
const { createServer } = require("./dashboard/server");
const { initIndex } = require("./bot/rag");

async function main() {
  await initIndex();
  await startBot();

  const port = process.env.DASHBOARD_PORT || 3000;
  const app = createServer();
  app.listen(port, () => {
    console.log(`대시보드 실행 중: http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("시작 실패:", err);
  process.exit(1);
});
