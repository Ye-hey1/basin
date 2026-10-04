<p align="center">
  <img src="apps/web/public/favicon.svg" alt="Basin" width="120" />
</p>

<div align="center">

# Basin

**Where work settles.**

AI-native 项目管理平台：任务流动到完成，完成的工作沉降为团队的知识资产，AI 同事替你清掉例行杂务。

</div>

---

## 这是什么

Basin 是一个开源（MIT）的 AI-native 项目管理平台：

- **项目管理本体** — 看板、需求管理、工作流规则、自定义字段、时间记录、团队协作
- **Brain 工作区知识库** — 任务/评论/需求/文档自动索引（pgvector），可被检索、被引用
- **AI 助理** — 对着项目提问，带引用来源回答，权限严格随用户
- **自动化 Agent** — 事件/定时触发的 AI 同事：分析阻塞任务、生成站会摘要、自动评论建议，全过程可审计
- **MCP 生态** — 内置 MCP server（可从 Claude/Cursor 操作任务）+ agent 侧 MCP client（可接外部工具）
- **桌面端** — Electron 壳（macOS/Windows/Linux），本地自包含运行

## 快速开始

```bash
./start-basin.sh                # PostgreSQL + Redis + API(1337) + Agent(1338) + Web(5174)
pnpm --filter @basin/desktop dev  # 打开桌面窗口
```

浏览器访问 http://localhost:5174，首次打开注册账号（首个注册用户即实例管理员）。

## 技术栈

Hono + Drizzle + PostgreSQL(pgvector) · React + TanStack Router/Query + Vite · Vercel AI SDK（provider 可换：OpenAI/Anthropic/Ollama/任意 OpenAI 兼容端点） · BullMQ + Redis（可选，无 Redis 时 AI 任务内联执行） · Electron

## 品牌图标

「沉降的完成列」：墨黑底上三根胶囊竖条是看板三列，电光蓝的完成列起始更低、延伸最深——**完成的工作沉在最深处**。

## 致谢

Basin 基于 [usekaneo/kaneo](https://github.com/usekaneo/kaneo)（MIT）深度改造而来，AI 内核的设计参考了 [rowboatlabs/rowboat](https://github.com/rowboatlabs/rowboat) 的工程模式。感谢上游项目与社区。

## License

MIT
