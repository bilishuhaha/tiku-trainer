// 自唤醒：Render 免费版闲置约 15 分钟会休眠（冷启动 30~60 秒）。
// 让运行中的进程每 5 分钟访问一次自己的 /api/ping，保持一直在线。
// 与 GitHub Actions 定时唤醒互为备份，避免任何单点失效导致休眠。
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const base =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.KEEPALIVE_URL ||
    "https://tiku-trainer.onrender.com";
  const INTERVAL = 5 * 60 * 1000;
  const run = async () => {
    try {
      await fetch(`${base}/api/ping?t=${Date.now()}`, {
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      // 失败不致命，下一轮继续
    }
    setTimeout(run, INTERVAL);
  };
  setTimeout(run, 60 * 1000);
}
