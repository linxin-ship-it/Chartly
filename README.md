# Chartly — AI 数据分析报告生成工具

上传 Excel/CSV 数据表格，输入分析需求，AI 自主规划、执行代码、分析数据，最终生成一份包含 ECharts 图表的可视化分析报告。

## 架构

```
frontend/   → Next.js 16 + Shadcn/ui + ECharts + Mermaid
backend/    → FastAPI + OpenAI SDK + Python 动态执行沙箱
```

**核心流程：**
1. 用户上传文件 + 输入分析需求
2. 后端启动 Agent 循环：LLM 规划 → 生成代码 → 执行 → 检查结果 → 继续/结束
3. 后端通过 SSE 实时推送结构化事件到前端
4. 前端根据事件类型路由到不同 UI 组件（思考卡片、代码卡片、报告渲染器等）

## 快速开始

### 1. 后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 配置 API Key（必须）。默认对接 DeepSeek，也可在 backend/.env 中填写
export OPENAI_API_KEY="sk-your-key"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"
export OPENAI_MODEL="deepseek-chat"

uvicorn app.main:app --reload --port 8000
```

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:3000

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENAI_API_KEY` | API 密钥（DeepSeek 控制台申请） | (必填) |
| `OPENAI_BASE_URL` | API 基础地址 | `https://api.deepseek.com/v1` |
| `OPENAI_MODEL` | 使用的模型 | `deepseek-chat`（可改为 `deepseek-reasoner` 等） |
| `MAX_AGENT_STEPS` | Agent 最大迭代步数 | `15` |

## 协议设计

LLM 输出使用 XML 标签协议，后端流式解析并转为 SSE 事件：

| 标签 | 前端路由 | 说明 |
|------|----------|------|
| `<THINKING>` | 思考卡片 | 模型推理过程 |
| `<PLAN>` | 计划卡片 | 执行计划 |
| `<TOOL_CALL>` | 代码卡片 | JSON 格式的工具调用 |
| `<TOOL_RESULT>` | 结果卡片 | 代码执行输出 |
| `<STATUS>` | 状态指示器 | 阶段切换 |
| `<REPORT>` | 报告渲染器 | 最终 Markdown 报告 |
