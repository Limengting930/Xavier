# 背了吗 · 后端（FastAPI）

面向国内公网的后端：手机 OTP 登录、多用户数据隔离、（二期）AI 代理。
配套前端见上级目录。完整设计见 `../docs/公网化迁移方案-FastAPI后端.md`。

## 目录结构

```
backend/
├── app/
│   ├── main.py          # 入口：CORS、注册路由、启动建表
│   ├── config.py        # 读 .env 配置
│   ├── database.py      # 数据库连接
│   ├── models.py        # 数据表（users/questions/user_progress/otp_codes）
│   ├── schemas.py       # 请求/响应格式
│   ├── auth.py          # JWT 签发/校验
│   ├── deps.py          # 当前登录用户依赖
│   ├── sms.py           # 腾讯云短信
│   └── routers/
│       ├── auth.py      # /api/auth/* 手机 OTP
│       ├── questions.py # /api/questions
│       └── progress.py  # /api/progress
├── scripts/import_questions.py  # 导入题库
├── requirements.txt
├── .env.example
└── Dockerfile
```

## 本地启动（开发期直连腾讯云数据库）

```bash
cd backend

# 1. 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
#   编辑 .env，至少填好 DATABASE_URL（腾讯云 PG 外网地址 + beile_dev 库）和 JWT_SECRET
#   开发期 DEV_FAKE_SMS 保持 true（不真发短信，验证码固定 000000）

# 4. 启动（首次启动会自动建表）
uvicorn app.main:app --reload --port 8000

# 5. 打开接口文档，可直接在网页测每个接口
#    http://localhost:8000/docs
```

## 导入题库

后端需要 `questions` 表有数据。准备一个 `questions.json`（数组），再导入：

```bash
python scripts/import_questions.py questions.json
```

**怎么得到 questions.json？** 三选一：
- 从现有线上应用（Builder 版）浏览器控制台导出：打开线上页面登录后，在 Console 运行现有 `loadQuestions()`
  的返回并 `JSON.stringify` 复制保存为 `questions.json`；
- 或从 Builder 后台把 `questions` 表导出为 JSON；
- 每项字段：`{ id, cat, q, summary, a, keywords, pitfalls, interview, diff, sort_order }`
  （`keywords/interview` 是数组或 JSON 字符串都可，脚本会自动转字符串存库）。

## 接口一览（前缀 /api）

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | /api/auth/send-otp | 否 | 发验证码（开发模式打印到后端控制台） |
| POST | /api/auth/login | 否 | 验证码登录/注册，返回 JWT |
| GET | /api/auth/me | 是 | 当前用户信息 |
| GET | /api/questions | 是 | 题库全量 |
| GET | /api/progress | 是 | 当前用户学习进度 |
| PUT | /api/progress | 是 | 覆盖写当前用户进度 |
| GET | /api/health | 否 | 健康检查 |

鉴权接口需带请求头：`Authorization: Bearer <登录返回的 token>`。

## 快速自测（不用前端）

1. 打开 `http://localhost:8000/docs`
2. `POST /api/auth/send-otp` 填手机号 → 执行（后端控制台会打印验证码 000000）
3. `POST /api/auth/login` 填手机号 + 000000 → 拿到 token
4. 页面右上「Authorize」填 `Bearer <token>` → 之后可测 /me、/questions、/progress

## 部署（二期，腾讯云云托管）

- 用 `Dockerfile` 构建镜像，部署到腾讯云云托管。
- 环境变量在云托管控制台配置（**不要写进镜像**）。
- 数据库连接串改为 `beile_prod` + 内网地址。
- `DEV_FAKE_SMS=false`、填好腾讯云短信配置。
