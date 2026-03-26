# Chartly — AI 数据复盘报告生成器

上传 Excel/CSV 数据表格 + 分析需求 → AI 自主多轮分析 → 生成带 ECharts 可视化的完整报告。

## 架构

```
┌─────────────┐     SSE Stream      ┌──────────────┐     OpenAI API
│   Next.js   │ ◄──────────────────► │   FastAPI     │ ◄──────────────►  LLM
│  (Frontend)  │    POST + Stream    │  (Backend)    │   Structured Tags
└─────────────┘                      └──────────────┘
                                           │
                                      exec() sandbox
                                      (Python code)
```

- **前端**：Next.js + shadcn/ui + Zustand + ECharts + Mermaid
- **后端**：FastAPI + OpenAI SDK + 动态 Python 执行
- **协议**：结构化标签 `<THINK>/<TOOL>/<REPORT>/<CHART>/<MERMAID>` 流式推送

## 快速开始

### 后端

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 填入 OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
cp .env.example .env.local  # 配置 NEXT_PUBLIC_API_URL
npm run dev
```

浏览器打开 http://localhost:3000

## 部署

### Vercel (前端)

1. 将项目推送到 GitHub
2. 在 Vercel 导入项目，Root Directory 设为 `frontend`
3. 设置环境变量 `NEXT_PUBLIC_API_URL` 为后端地址

### 后端

可部署到 Railway / Render / Fly.io 等平台：

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 配色方案

| 用途 | 色值 |
|------|------|
| Header / 侧边栏背景 | `#222222` |
| 主页面背景 | `#262626` |
| 文字 / Icon | `#FFFFFF` |
| 强调色 / 主按钮 | `#6CC3C5` |
| 辅助文字 | `#A1A1A1` |

## License

MIT
