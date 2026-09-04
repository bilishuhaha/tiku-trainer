// Render 定时任务：定期访问网站，防止免费版休眠（冷启动）
const url = process.env.KEEPALIVE_URL || "https://tiku-trainer.onrender.com/login";
try {
  const res = await fetch(url, { redirect: "follow" });
  console.log("ping", url, res.status);
  if (!res.ok) process.exit(1);
} catch (e) {
  console.error("ping failed:", e.message);
  process.exit(1);
}
