# Chartly — AI 数据复盘报告生成器

上传 Excel/CSV 数据表格 + 分析需求 → AI 自主多轮分析 → 生成带 ECharts 可视化的完整报告。

## 架构

```
┌─────────────┐                    ┌──────────────────┐
│   Next.js   │  ── /api/analyze → │ Python Serverless │ ── OpenAI API → DeepSeek
│  (Frontend)  │    SSE Stream     │  (Agent + exec)   │
└─────────────┘                    └──────────────────┘
```

**Vercel 一键部署**：前端 Next.js + 后端 Python Serverless Function 整包在 Vercel。

## 快速部署到 Vercel

1. Fork / Push 到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. **Root Directory** 设为 `frontend`
4. 设置环境变量：
   - `OPENAI_API_KEY` — DeepSeek API Key
   - `OPENAI_BASE_URL` — `https://api.deepseek.com`
   - `OPENAI_MODEL` — `deepseek-chat`
5. 部署完成

> Vercel Pro 套餐支持 Serverless Function 最长 5 分钟，Hobby 套餐约 1 分钟。复杂分析建议使用 Pro。

## 本地开发

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
cp .env.example .env.local
npm run dev
```

浏览器打开 http://localhost:3000

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
