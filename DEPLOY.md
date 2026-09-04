# 部署到公网指南（免费方案：Vercel + Supabase）

目标：网站部署到云端，任何电脑 / 手机用网址访问，**不需要你这台电脑开机**。

代码已改造为“本地 SQLite / 云端 PostgreSQL 自动切换”，下面只需做一次账号与配置。

---

## 0. 原理

| 角色 | 用谁 | 作用 |
|---|---|---|
| 网站程序 | **Vercel**（免费 Hobby） | 托管网页，自动 HTTPS 域名 |
| 数据库 | **Supabase**（免费） | 云端 PostgreSQL，数据持久保存、所有教练共用 |

> 代码里已内置：`DATABASE_URL` 是 `postgres://...` 时自动用 PostgreSQL，否则用本地 SQLite。所以本地照常用，云端自动走 PG。

---

## 1. 需要先注册的 3 个免费账号（约 10 分钟）

1. **GitHub**：https://github.com —— 用来放代码
2. **Vercel**：https://vercel.com —— 建议直接用 GitHub 账号登录
3. **Supabase**：https://supabase.com —— 用邮箱注册

---

## 2. 创建云端数据库（Supabase）

1. 登录后点 **New project**：
   - 名字随意，如 `tiku-trainer`；
   - **Database Password 记下来**（后面要用）；
   - Region 选离你近的（如 `Singapore` / `Southeast Asia`）。
2. 等待创建完成后，进入 **Project Settings → Database → Connection string**：
   - 选 **Session pooler**（端口 6543 那一个），把连接串复制出来，形如：
     ```
     postgresql://postgres.xxxxx:密码@aws-0-xxx.pooler.supabase.com:6543/postgres
     ```
   - 如果密码里有 `@ / : #` 等特殊字符，需要 URL 编码（可把密码发我帮你拼好）。

---

## 3. 把代码推到 GitHub

在本项目目录打开终端执行（把 `你的用户名` 换掉）：

```bash
git remote add origin https://github.com/你的用户名/tiku-trainer.git
git branch -M main
git push -u origin main
```

（如果还没在 GitHub 建空仓库，先在网页上 New repository，名字 `tiku-trainer`，不要勾选任何初始化文件。）

---

## 4. 在 Vercel 部署

1. 登录 Vercel → **Add New → Project** → 选择 `tiku-trainer` 仓库 → **Import**；
2. Framework 会自动识别为 Next.js，不用改；
3. 在 **Environment Variables** 添加（点 Add 逐条加）：

   | 名称 | 值 |
   |---|---|
   | `DATABASE_URL` | 第 2 步复制的 Supabase 连接串 |
   | `SESSION_SECRET` | 一串随机字符（越长越好，可临时用：`sk-` + 随机 40 位） |
   | `INVITE_CODE` | 你给同事的注册邀请码，如 `TIKU2027`（防止陌生人注册） |
   | `COOKIE_SECURE` | `true` |

4. 点 **Deploy**，约 1-2 分钟完成；
5. 部署成功后访问它给的域名，例如 `https://tiku-trainer-xxx.vercel.app`——**这就是公网地址**，手机/其他电脑直接打开就能用。

> 首次打开会自动建好所有数据表（代码内置幂等建表），无需手动建库。

---

## 5. 上线后第一件事

1. 用公网网址打开 → 登录页点 **“教练注册”** → 填入第 4 步的 `INVITE_CODE` 注册你自己；
2. 以后同事/其他教练也用这个网址注册（填同一个邀请码）；
3. 每个教练只能看到自己的学生；数据库是共用的，将来 AI 学习可汇总脱敏数据。

---

## 6. 日常更新代码

以后每次我帮你改了功能，在项目里执行：

```bash
git add -A && git commit -m "更新说明" && git push
```

Vercel 检测到 push 会自动重新部署，一般 1 分钟内生效，**数据不受影响**（都存在 Supabase）。

---

## 7. 常见问题

- **连不上数据库（部署失败/500）**：确认用的是 Session pooler 连接串；密码特殊字符需 URL 编码。可把连接串（注意脱敏）发我核对。
- **想换成自己的域名**：Vercel 项目 → Settings → Domains 添加。
- **忘记密码**：目前没有“找回密码”邮件，可让我在 Supabase 里重置；或该教练重新注册一个（注意会新建空账号）。
- **担心陌生人注册**：`INVITE_CODE` 务必设置；之后想让谁注册就把码发给谁。
- **费用**：以上均为免费额度，日常几十个学生绰绰有余；超出后会提示升级，不用担心突然扣费。
- **本机那份还能用吗**：能。`.env` 不写 `DATABASE_URL`(或写 `file:...`) 就还是本地 SQLite 模式，互不影响。

---

## 8. 我能帮你做的下一步

- 你把 Supabase 连接串（去掉密码也行，我再帮你拼）+ 建好 GitHub 仓库后告诉我，我可以：
  1. 在本地用你的真实连接串**预验证**一次数据库读写；
  2. 帮你写好后缀的部署检查清单。
- 如果你想完全托管我来操作（含创建账号），需要你把 Vercel / Supabase 的登录方式交给我（一般不建议直接给密码；可给临时的 Access Token）。
