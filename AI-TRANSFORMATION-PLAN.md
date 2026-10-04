# Basin AI-Native 改造方案

> 参考 [rowboat](https://github.com/rowboatlabs/rowboat) 的 AI 内核模式，将 basin 从「项目管理平台」升级为「会自己做工作的项目管理平台」。
> 版本基线：basin v2.24.0（本地分叉，含需求管理模块、i18n 中英裁剪、JSON 错误信封）。
> 本方案经过逐分支决策评审（grill-me），所有关键决策已确认，见文末决策记录。

---

## 1. 定位与原则

**定位**：保留 basin 项目管理本体（任务/项目/需求/工作流/集成），移植 rowboat 的 AI 内核——**记忆（Brain）、会干活的 agent（自动化）、工具生态（MCP）**，外加会议纪要能力。

**改造纪律（上游同步策略：纪律性分叉）**：
- 全部新逻辑进**新 app / 新包 / 新表 / 新 route 模块**
- 对上游既有文件只做「接线式」最小修改（挂载入口），改动集中记录在 §7
- 目标：未来可继续 `git merge` 上游版本（v2.25+），不污染合并路径

**非目标（明确砍掉，源自 rowboat 但不适配 PM 场景）**：
- 隔离浏览器（agent 不做通用网页操作）
- Code Mode（并行编码 agent；basin 已有 GitHub/Gitea 集成承担代码侧联动）
- Spaces/Harbor 多人协作协议（basin 本身就是多人协作工具）
- Electron 桌面端 / 本地优先文件存储（basin 是自托管 Web 架构）
- 邮件分诊（basin 已有邮件与 IM 集成承担外部消息入口）

---

## 2. 总体架构

```
┌──────────┐     ┌──────────────┐      ┌─────────────────┐
│ apps/web │────▶│   apps/api   │─────▶│  Postgres 16    │
│ TanStack │     │  Hono+Drizzle│      │  + pgvector     │
│ Router   │     │  (现有+挂载点) │      │  业务表+Brain表  │
└──────────┘     └──────┬───────┘      └────────▲────────┘
                        │ 事件/任务入队           │
                        ▼                       │
                 ┌──────────────┐               │
                 │ Redis        │        ┌──────┴──────────┐
                 │ (现有,ioredis)│───────▶│  apps/agent     │
                 │ BullMQ 队列   │        │  (新增 worker)  │
                 └──────────────┘        │  · AI SDK 循环  │
                                         │  · 索引管道     │
                                         │  · 转写管道     │
                                         └───┬────┬────┬──┘
                                             ▼    ▼    ▼
                                          LLM   MCP   转写
                                          多provider  API/本地
```

**进程拓扑**：`apps/agent` 为 monorepo 新增兄弟应用（独立 Node 进程），复用现有 `@basin/db`（drizzle schema）、`@basin/permissions`、`@basin/libs`。与 API 通过 BullMQ 队列通信（Redis 为 API 现有硬依赖，不新增中间件）。开发时 `turbo dev` 一并拉起；部署时 docker-compose/helm 各加一个 service。

**AI 运行时**：Vercel AI SDK 做统一 provider 层（OpenAI / Anthropic / Ollama / DeepSeek 等 adapter，流式 + tool-call 内建），agent 循环自研精简版（AI SDK `generateText` + `maxSteps` + tools + 队列重试）。学 rowboat 的「编排自研、模型可换」模式，不绑固定框架、不绑单厂商。

---

## 3. 分期计划

### 期 1：基建 + Brain + AI 问答助理（用户可见价值：对着项目提问）

**1.1 基建**
- 新建 `apps/agent`：tsx/esbuild 构建（对齐 api 现有模式）、BullMQ worker、健康检查端口
- 新建 `packages/ai`：provider 工厂（按实例配置实例化 chat/embedding 模型）、prompt 模板、token 计量
- pgvector 迁移：Postgres 镜像换 `pgvector/pgvector` 变体；新增 `CREATE EXTENSION vector`
- 实例管理页新增「AI 配置」：provider 选择、base URL、API key（加密落库，实例级配置；自托管用户自带 key）
- 队列约定：`index`（索引管道）、`agent`（自动化任务）、`transcribe`（转写管道）三条 BullMQ 队列

**1.2 Brain 工作区知识库**
- 索引源：任务（标题/描述/状态）、评论、需求文档（复用你们的需求管理模块）、上传文档（pdf/md/txt，走现有 S3 storage）
- 管道：api 在任务/评论/需求变更时发领域事件（复用现有 `events` 模块）→ 入 `index` 队列 → worker 分块（按 markdown 标题/段落，512 token 重叠 64）→ embedding → upsert
- 正文以 **Markdown 存表**（保留 rowboat「纯文本可读」优点），向量列 `vector(1536)`（维度随 provider 配置）
- **权限继承**：所有 chunk 带 workspace/project 决，检索时按发起用户的权限过滤——Brain 永不越过 basin 现有权限模型

**1.3 AI 问答助理**
- Web 新增助理入口（全局侧边面板 + `/assistant` 页）：会话线程、流式回复、**引用来源卡片**（点击跳转原任务/需求）
- API 新增 `ai` route 模块：线程 CRUD、消息、SSE 流式端点（Hono streamSSE，复用现有鉴权中间件）
- RAG 链路：问题 → 混合检索（pgvector 相似度 + Postgres 全文检索）→ 权限过滤 → 拼 prompt → 流式回答

**新表**：`ai_provider_config`、`brain_documents`、`brain_chunks`、`ai_threads`、`ai_messages`

**期 1 验收**：本地 `turbo dev` 一键起全栈；导入示例项目后，助理能回答「X 项目现在卡住的任务有哪些」「需求 Y 的验收标准是什么」并给出可点击引用；回答范围严格随用户权限。

---

### 期 2：自动化 agent + MCP client（用户可见价值：agent 替人做例行工作）

**2.1 触发器（复用现有骨架）**
- 事件触发：任务状态变更、任务逾期、评论 @assistant、需求变更——挂接现有 `events` / `workflow-rule` 语义，新增 `agent` 动作类型
- 定时触发：复用现有 `scheduler` 模块（如「每天 08:30 生成本项目站会摘要并评论到指定任务」）

**2.2 Agent 工具集（agent 的手）**
- 内部工具（进程内函数调用，不走 HTTP）：任务 CRUD、评论、搜索、用户/项目查询、Brain 检索——全部经 `@basin/permissions` 作用域检查，以触发上下文身份执行
- 外部工具：MCP client（`@modelcontextprotocol/sdk`，已在依赖中），支持 stdio + streamable HTTP，workspace 级配置 MCP server 列表（`mcp_servers` 新表 + 配置 UI）

**2.3 审计与可观测**
- `agent_runs`（每次执行：触发源、输入、状态、token 用量、耗时）+ `agent_run_steps`（每步：工具调用、参数、结果摘要）
- Web 新增「Agent 运行记录」页：时间线、步骤展开、失败重跑
- agent 产出写回 basin 时带标识（如评论署名 🤖），保证人机可区分

**新表**：`agent_triggers`、`agent_runs`、`agent_run_steps`、`mcp_servers`

**期 2 验收**：配置「任务被标记阻塞超过 3 天 → agent 分析阻塞原因并在任务下评论建议」与「每日 08:30 → 汇总昨日进展评论到站会任务」两条触发器，均自动执行且在运行记录页可审计；agent 可调用一个外部 MCP 工具（如 web search）。

---

### 期 3：会议纪要（用户可见价值：开完会任务自动建好）

**管道**（纯异步，复用期 1/2 基建）：
1. 用户在项目内上传会议录音（mp3/m4a/wav，走现有 S3 storage）
2. `transcribe` 队列 → 转写 provider 抽象层：默认 Whisper API（OpenAI/Groq，配置即用）；可选 compose profile 启动本地 faster-whisper 容器（数据不出门），共用同一接口
3. 转写文本 → LLM 生成结构化纪要（摘要/决议/行动项，行动项含负责人建议与截止日期建议）
4. 行动项进入**人工确认**页：用户勾选/修改后一键创建为任务（关联项目、列、负责人）
5. 纪要落 Brain 索引（期 1 管道自动覆盖）

**新表**：`meetings`、`meeting_transcripts`、`meeting_action_items`

**期 3 验收**：上传一段 30 分钟会议录音，10 分钟内产出结构化纪要；确认后行动项成为真实任务并可指派；纪要在 AI 问答中可被检索引用。

---

## 4. 数据模型新增总览（Drizzle，全部增量表，不动现有表）

| 表 | 归属期 | 要点 |
|---|---|---|
| `ai_provider_config` | 1 | 实例级 provider/baseURL/key（加密）/embedding 模型/向量维度 |
| `brain_documents` | 1 | 来源类型/源 id/workspace/project/正文 Markdown/版本 |
| `brain_chunks` | 1 | document_id/内容/`vector` 列/权限快照列 |
| `ai_threads` / `ai_messages` | 1 | 会话与消息，含引用来源 JSON |
| `agent_triggers` | 2 | 类型(event/cron)/条件/agent 指令/prompt/启用状态 |
| `agent_runs` / `agent_run_steps` | 2 | 审计：状态、token、步骤明细 |
| `mcp_servers` | 2 | workspace 级 MCP server 配置 |
| `meetings` / `meeting_transcripts` / `meeting_action_items` | 3 | 音频引用/转写文本/行动项状态 |

## 5. 技术选型汇总

| 决策点 | 选型 | 备选与否决理由 |
|---|---|---|
| LLM 层 | Vercel AI SDK | LangChain/Mastra 抽象税高；单厂商 SDK 绑死 |
| Agent 循环 | 自研精简（AI SDK tool-call loop + BullMQ） | rowboat 同模式：编排自研、模型可换 |
| 向量存储 | Postgres + pgvector | 本地 Markdown 文件（rowboat 式）需重做多人权限/备份；独立向量库多一个有状态服务 |
| 队列 | BullMQ（复用现有 Redis） | pg-boss 无必要——Redis 已是硬依赖 |
| MCP client | `@modelcontextprotocol/sdk`（已有依赖） | — |
| 转写 | Whisper API 默认 + 本地 faster-whisper（compose profile 可选） | 纯 hosted 出域；纯本地 CPU 慢、强制多容器 |
| 聊天 UI | 现有 TanStack 栈 + AI SDK `useChat` + SSE | 不引入新前端框架 |

## 6. 部署物变化

- `deploy/` 与 `charts/basin`：新增 `agent` service（同一镜像、不同入口命令）；Postgres 镜像 → `pgvector/pgvector:pg16`；新增 `AI_*` 环境变量（默认 key、本地转写 endpoint 等）
- 新增 compose profile：`transcription-local`（faster-whisper 容器）
- 开发环境：`turbo dev` 自动含 agent worker；`start-basin.sh` 追加第 4 步

## 7. 对上游文件的接线式改动清单

**期 1 已落地（18 个修改文件 + 14 个新文件，见下）。** 源码级修改的文件（不含生成物 openapi.json / routeTree.gen.ts / pnpm-lock.yaml / drizzle journal）共 13 个，全部为「接线式」最小改动：

| 文件 | 改动 |
|---|---|
| `apps/api/src/index.ts` | 挂载 `ai` route、AppType union、启动时注册 Brain 索引监听器 |
| `apps/api/package.json` | 子路径导出 `./database`、`./ai-pipeline`（agent worker 用）+ 新依赖 |
| `apps/api/src/database/schema.ts` | 文件末尾追加 5 张 AI 表 + vector 自定义类型 |
| `apps/api/src/database/relations.ts` | 末尾追加 4 组 relations + import |
| `apps/api/src/database/index.ts` | schema 对象注册新表 |
| `apps/api/drizzle/0049_*.sql` | 新迁移（含 `CREATE EXTENSION vector`） |
| `apps/api/src/requirement/controllers/*.ts`（4 个） | 各加一处 `publishEvent` 需求/文档事件 |
| `apps/web/package.json` | `@ai-sdk/react`、`@basin/ai` 依赖 |
| `apps/web/src/components/nav-main.tsx` | 助理导航入口 |
| `apps/web/src/routes/.../settings.tsx` | 管理员可见的 AI 设置 tab |
| `i18n/en-US.json`、`i18n/zh-CN.json` | 新增 `ai` 命名空间 + 2 个导航词条 |

**期 2/3 预期改动**：`deploy/`、`charts/`、compose（agent service、pgvector 镜像、本地转写 profile）、根 `start-basin.sh`（工作区脚本，期 1 已更新）。

其余全部为新文件/新目录，保证上游 merge 干净。

### 期 1 交付状态（2026-10-03，feat/ai-native-phase1 分支）

- ✅ `packages/ai`（provider 工厂/chunker/prompt/embed）+ `apps/agent`（BullMQ worker + 健康检查 1338）
- ✅ 5 张新表 + pgvector 迁移；`apps/api/src/ai/`（config 加密落库、索引管道、混合检索、线程/消息、流式问答、事件监听）
- ✅ Web：`/dashboard/assistant` 助理页（线程/流式/引用跳转）、设置 → AI（实例管理员配置页，provider/baseURL/key/模型）
- ✅ 队列双模式：有 Redis 走 BullMQ 跨进程（已验证 agent 收到任务），无 Redis API 内联降级（已验证回退路径）
- ✅ 测试：chunker 单测 + Brain 管道集成测试 5 项（索引/去重/检索/工作区隔离/删除联动）全绿；全仓 typecheck 9/9、openapi/i18n 同步
- ⏳ 待用户动作：在 设置 → AI 配置真实 provider（或环境变量 `AI_PROVIDER` 等）后，索引管道与 RAG 问答即激活；浏览器端 UI 走查待真实对话后进行

### 桌面端改造（2026-10-03 启动，M1 已交付）

**选型结论**（对齐 rowboat 的已验证方案，见其 `apps/x`）：Electron 壳 + 本地 Hono 服务。rowboat 用 `ELECTRON_RUN_AS_NODE=1` 把 Electron 自带 Node 当独立解释器跑 esbuild 产物（不需要打包 Node 运行时）、`/health` 轮询门控、`server-key` 本地认证、`app://` 自定义协议加载渲染层——basin 全部照此设计。与 rowboat 的唯一架构分歧：basin 桌面化必须内嵌 PostgreSQL（rowboat 是纯 Markdown 文件存储）。

**M1 — 可打开的窗口（已交付）**：`apps/desktop`（`pnpm --filter @basin/desktop dev`）
- `src/main/server-host.ts`：双模式——`external`（默认，连接 start-basin.sh 已运行的栈，边改造边看效果）/ `child`（`BASIN_DESKTOP_MODE=child`，ELECTRON_RUN_AS_NODE spawn apps/api，tsx 直跑源码或 dist）
- 健康门控：窗口先显示连接页，API 就绪后自动切入应用；运行中掉线自动回切（watchHealth 3s 探测）
- `app://`（basin://）自定义协议服务 `apps/web/dist`（SPA fallback + 路径穿越防护），渲染层 `resolveApiBaseUrl` 默认即指向 localhost:1337，无需改造
- 单实例锁、mac 菜单（重载/DevTools/缩放）、preload 暴露 `window.basinDesktop`
- 环境变量：`BASIN_DESKTOP_MODE` / `BASIN_DESKTOP_API_URL` / `BASIN_DESKTOP_RENDERER_URL` / `BASIN_DESKTOP_APP_PROTOCOL=1`

**M2 — 自包含运行（待做）**：`embedded-postgres` 分发 PG16 二进制（darwin arm64/x64，PGDATA 放 `~/Library/Application Support/Basin/`）+ 打包 pgvector 扩展（本机源码编译产物可直接入库）+ 首启 `CREATE EXTENSION vector` + 迁移复用 migrate-on-startup；`BASIN_DESKTOP_MODE=child` 切为默认。

**M3 — 打包分发（待做）**：electron-forge maker-dmg（对齐 rowboat）+ 代码签名/公证（需 Apple Developer ID）+ electron-updater（GitHub Releases）；`basin://` deeplink、托盘、开机启动项。

**M4 — 桌面化补齐（待做）**：本地磁盘存储适配器替代 S3-only（头像/附件/期 3 会议录音的硬前置）。

接线清单新增：`pnpm-workspace.yaml`（onlyBuiltDependencies + electron）。

### 期 2 交付状态（2026-10-03，同分支）

- ✅ 4 张新表 + 迁移 0050（agent_trigger / agent_run / agent_run_step / mcp_server）
- ✅ 运行时 `apps/api/src/agents/`：权限检查（镜像 HTTP 侧的角色解析）、内部工具集（search_tasks / list_tasks / get_task / list_projects / add_comment，写路径仅评论且带 🤖 标识）、LLM 循环（AI SDK generateText，最多 6 步，120s 超时）、runs + steps 全量审计
- ✅ 触发器：事件监听（task.status_changed / task.due_date_changed / requirement.updated，条件 JSON 匹配；agent 自身发起的事件带 `agent:` initiator 前缀被跳过，杜绝自激循环）+ cron 调度（每分钟 DB 驱动 tick，croner 表达式，job_lease 多实例互斥 + lastFiredAt 双保险）
- ✅ MCP client：streamable HTTP + stdio 双传输，工具名空间化，连接失败跳过不拖垮运行；MCP CRUD 凭证（env/headers）永不出 API（仅 hasEnv/hasHeaders 标志）
- ✅ Web：`/dashboard/agents` 管理页（触发器 CRUD/立即运行/运行历史含步骤展开、MCP 服务器注册/启停/删除）
- ✅ 队列：`basin-agent-run` 双模式（Redis → agent worker 第二消费者；无 Redis → API 内联）
- ✅ 验证：单测 409 全绿（含条件匹配）；运行器集成测试 3 项（工具循环+评论写回、viewer 权限拒绝写回、模型失败标记 failed）全绿；全仓 typecheck 9/9、openapi/i18n 同步；活体 E2E（触发器 CRUD + 非法 cron 400、manual run 审计、MCP 凭证不泄漏、任务状态变更自动产生 event run）全部通过
- 📋 范围裁剪记录：`update_task` 工具未纳入期 2（避免 agent 改状态自触发；已有 `agent:` initiator 防环机制，后续放开需配合）；「评论 @assistant 触发」挪至后续（聊天面板已存在，评论桥接属产品打磨）

## 8. 风险与缓解

| 风险 | 缓解 |
|---|---|
| pgvector 检索质量不足 | 混合检索（向量+全文+关键词），期 1 内置引用溯源便于评估；模型/维度可配置随时换 |
| agent 误操作数据 | 工具全部经权限作用域；写操作先以「草案评论/待确认任务」落地；runs 审计 + 一键重跑 |
| LLM key 成本失控 | token 计量落库（runs 表），实例级月度配额上限，超限降级只读问答 |
| 转写音频出域顾虑 | 本地 faster-whisper profile 常驻可选，接口同构切换 |
| 上游合并冲突 | §7 接线清单纪律；每次上游合并跑 `pnpm typecheck && pnpm test` 全量回归 |

---

## 9. 决策记录（grill-me 评审结论）

1. **定位**：AI-native 项目管理——保留 basin PM 本体，移植 rowboat AI 内核（否决：复刻 rowboat 赛道 / 纯架构升级 / 双线并行）
2. **能力范围**：三件套（Brain+问答、自动化 agent、MCP client）+ 会议纪要进一期交付盘子；浏览器/Code Mode/Spaces/邮件分诊砍掉
3. **会议输入**：录音上传 + 异步转写（否决：浏览器实时转写，列二期可选）
4. **进程形态**：独立 `apps/agent` worker（否决：嵌入现有 API 进程）
5. **Brain 存储**：Postgres + pgvector，正文 Markdown 存表（否决：本地 Markdown 文件 / 独立向量库）
6. **LLM 层**：AI SDK + 自研循环（否决：成熟框架 / 单厂商 SDK）
7. **转写**：API 默认 + 本地容器可选
8. **上游策略**：纪律性分叉，接线式改动 + 清单，保留 merge 上游能力
9. **节奏**：三期压缩（基建并入 Brain 期），每期有可验收的可见价值

---

## 10. 品牌重塑：Basin（2026-10-04）

应用正式定名 **Basin**（泊船湾 / 沉积盆地）：任务完成归港，完成的工作层层沉淀为团队知识资产——与「沉降的完成列」图标和 Brain 功能同源。

**彻底独立分叉**（放弃上游 merge 路径），全量重命名已完成：

- **包名**：`@kaneo/*` → `@basin/*`（全部 workspace 包 + 引用 + lockfile 重新生成）
- **环境变量**：`KANEO_*` → `BASIN_*`（代码 + .env + 文档 + 图表）
- **数据层**：Postgres 数据库 `kaneo` → `basin`、角色 `kaneo` → `basin`（`ALTER DATABASE/ROLE RENAME`，数据零丢失，测试库 `basin_test` 同步创建）
- **协议与队列**：`kaneo://` → `basin://`、队列 `kaneo-ai-index`/`kaneo-agent-run` → `basin-*`
- **文件与目录**：仓库目录 `kaneo/` → `basin/`、`charts/`、`Dockerfile.basin`、`start-basin.sh`、MCP/planka-import/web 组件源文件
- **品牌层**：README 重写、i18n 双语全部文案、favicon/logo/PWA 资产全部换新图标、OpenAPI 标题 "Basin API"
- **仅保留**：`CHANGELOG.md`（上游历史记录）与 `LICENSE`（法律归属）原文未动

验证：typecheck 10/10、单测全绿、集成测试 288 全绿、i18n/openapi 同步、全栈 + 桌面端重启正常。
