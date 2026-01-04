# 登录与工作流后端服务说明

本目录提供项目后端（Node.js + Express + MySQL）的实现，负责用户认证、对话记录、八步流程数据持久化，以及本次新增的“任务拆解 → 问题分析 → 集成分析”支撑接口。

## 1. 环境与启动

- 运行环境：Node.js ≥ 16，MySQL ≥ 8.0
- 安装依赖：在项目根目录和本目录分别安装
- 数据库会在服务启动时自动创建并迁移（新增表/字段采用“存在则忽略”的方式）

环境变量（在 `login-backend/.env`）示例：

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=user_system
PORT=3000
JWT_SECRET=your_jwt_secret_key
# AI代理调用时建议前端携带 Authorization 头，这里不强制配置 API Key
```

启动（PowerShell）：

```powershell
# 在项目根目录安装并启动前端（可选）
npm install

# 启动后端
cd login-backend
npm install
node server.js
```

服务默认监听：http://localhost:3000

## 2. 数据库结构（核心表）

服务启动时自动创建/变更以下表：

- users：用户表（id, username, password, created_at）
- conversations：对话消息（user_id, task_name, message_id, sender, user_question/ai_response, created/updated_at）
- dialog_tasks：对话任务列表（user_id, task_name, is_active, created/updated_at）
- ai_content：模板页内容（area, audience, keywords, tone, prompt, task_name, timestamp/updated_at）
- task_manager_content：任务管理页内容（ai_response, added_tasks, task_details, task_name, plan_tasks, plan_versions，新增：complexity, sub_tasks_json, sub_tasks_count）
- new_integration_analysis：集成分析数据（task_name, all_issues, selected_issues, ai_solution, created_at）
- results_solutions：两个方案（task_name, analysis_id, selected_issues, solution1/2_title, solution1/2_content, created_at）
- template_selection_records：方案对比页保存记录（左右内容+AI推荐方法、created/updated_at）
- visualization_assessments：可视化评分（task_name、radar数据、评分细项、user_id、时间戳）
- final_result_expanded：最终整合方案（task_name, method_content, base_content, combined_plan, 时间戳）
- executable_plans：可执行实施方案（task_name, plan_text, code_only_text, code_blocks, language, env, user_id, 时间戳）
- 新增 sub_tasks：子任务列表（task_name, sub_task_name, description, difficulty, task_order, status, 时间戳）
- 新增 task_problems：按子任务分组的问题清单（task_name, sub_task_id, sub_task_name, problem_description, is_critical, is_selected, 时间戳）

表及字段会在 `server.js` 启动阶段通过 CREATE TABLE / ALTER TABLE 自动保障存在。

## 3. 新增能力与数据流

在不改变原有八步流程的基础上，后端新增支持：

1) TaskManager 阶段调用 AI 将当前任务拆解为 1-5 个子任务；
2) 保存子任务到数据库；
3) 让 AI 基于所有子任务输出“可能存在的问题”清单，按子任务分组；
4) 保存问题清单，NewIntegration 页面按子任务展示，用户勾选后进入后续步骤。

数据流概览：

```
Template → TaskManager
  ├─ POST /api/ai/decompose-subtasks           # AI拆解子任务
  ├─ POST /api/sub-tasks/batch                 # 保存子任务
  ├─ POST /api/ai/analyze-task-problems        # AI分析所有子任务问题
  └─ POST /api/task-problems/batch             # 保存问题清单

NewIntegration
  ├─ GET  /api/sub-tasks/:taskName             # 拉取子任务列表
  ├─ GET  /api/task-problems/:taskName         # 拉取分组问题
  └─ PUT  /api/task-problems/selection         # 保存选中问题

（后续 Results → TemplateSelection → FinalResult → Visualization 沿用原有接口）
```

## 4. 接口说明（新增/改动）

以下仅列出与“子任务/问题”相关的新接口；原有接口如注册登录、对话、模板保存、结果保存等保持不变，可参考 `server.js` 中其他路由。

### 4.1 子任务拆解（AI）
- POST `/api/ai/decompose-subtasks`
- Body
```json
{
  "taskName": "智能客服系统设计",
  "templateData": { "area": "…", "audience": "…", "prompt": "…" }
}
```
- Response
```json
{
  "complexity": "simple|medium|complex",
  "subTasks": [
    { "name": "需求分析", "description": "…", "difficulty": "medium" }
  ]
}
```
- 说明：服务端通过 `openai.qiniu.com/v1/chat/completions` 调用模型，兼容只返回 JSON；如模型带解释文本，会提取首个 JSON 块解析。
- 身份/鉴权：沿用现有 `/api/ai` 约定，透传前端 `Authorization` 头（可为空）。

### 4.2 批量保存子任务
- POST `/api/sub-tasks/batch`
- Body
```json
{
  "taskName": "智能客服系统设计",
  "subTasks": [
    { "name": "需求分析", "description": "…", "difficulty": "medium" },
    { "name": "技术架构", "description": "…", "difficulty": "hard" }
  ]
}
```
- 行为：
  - 清空该任务旧子任务；
  - 按顺序插入新子任务（自动生成 task_order = 1..N）；
  - 回写 `task_manager_content.sub_tasks_json` 与 `sub_tasks_count`。

### 4.3 获取子任务
- GET `/api/sub-tasks/:taskName`
- Response
```json
{ "success": true, "subTasks": [ {"id":1, "sub_task_name":"…", "task_order":1, …} ] }
```

### 4.4 分析所有子任务的问题（AI）
- POST `/api/ai/analyze-task-problems`
- Body
```json
{
  "taskName": "智能客服系统设计",
  "subTasks": [
    { "name": "需求分析", "description": "…" },
    { "name": "技术架构", "description": "…" }
  ]
}
```
- Response
```json
{
  "problems": [
    {
      "subTaskName": "需求分析",
      "issues": ["问题1", "问题2"],
      "criticalIssues": [0]
    }
  ]
}
```
- 说明：服务端同样通过 `openai.qiniu.com` 代理，返回 JSON；若模型返回混合文本，将提取首个 JSON 块。

### 4.5 批量保存问题清单
- POST `/api/task-problems/batch`
- Body（承接 4.4 的输出）
```json
{
  "taskName": "智能客服系统设计",
  "problems": [
    { "subTaskName": "需求分析", "issues": ["…"], "criticalIssues": [0,2] }
  ]
}
```
- 行为：清空旧问题 → 依据子任务名映射 sub_task_id → 插入问题 → 标注关键问题。

### 4.6 获取问题清单（分组）
- GET `/api/task-problems/:taskName`
- Response
```json
{
  "success": true,
  "problems": {
    "需求分析": [
      { "id": 10, "description": "…", "isCritical": true, "isSelected": false }
    ],
    "技术架构": [ … ]
  }
}
```

### 4.7 更新“已选问题”
- PUT `/api/task-problems/selection`
- Body
```json
{ "taskName": "智能客服系统设计", "selectedIds": [10,11,20] }
```
- 行为：将该任务所有问题 `is_selected` 置为 false，再将传入 ID 置为 true。

### 4.8 清理任务（扩展说明）
- DELETE `/api/tasks/by-name/:taskName`
- 行为：清理 conversations、dialog_tasks、ai_content、task_manager_content、results_solutions、new_integration_analysis、visualization_assessments、final_result_expanded、template_selection_records，以及（新增）`sub_tasks`、`task_problems` 中对应数据。

### 4.9 可执行实施方案
- 保存方案
  - POST `/api/executable-plan/save`
  - Body: `{ "taskName": "...", "planText": "...", "codeOnlyText": "...", "codeBlocks": [...], "language": "...", "env": "...", "userId": 1 }`
- 获取方案
  - GET `/api/executable-plan/:taskName` (获取最新)
  - GET `/api/executable-plan/id/:id`

## 5. 与现有 AI 代理的关系
- 现有非流式代理：`POST /api/ai`（统一转发到 `openai.qiniu.com/v1/chat/completions`）
- 现有流式代理：`POST /api/combined-plan/stream`（SSE）
- 新增两个 AI 端点本质也是同样的代理调用，只是封装了提示词与返回 JSON 的解析
- 鉴权：建议前端在请求头附带 `Authorization: Bearer <your_key>`，后端将透传给上游。

## 6. 错误处理与返回规范
- 新接口在参数缺失、上游错误、JSON 解析失败时，会返回 `4xx/5xx`，并携带 `message` 或 `raw` 便于排查。
- 批量写入接口采用“先清空再写入”的幂等策略，前端可重复调用。

## 7. 安全与后续建议
- 目前多数业务接口未强制鉴权，仅登录注册使用 JWT；如需上线建议为关键接口增加鉴权中间件。
- 对外 API 需配合前端校验与限流，以避免超量 AI 调用。
- 根据需要，可为 `sub_tasks` 增加状态字段（进行中/完成时间），并联动后续步骤统计与可视化。

---

如需扩展或对接前端页面（TaskManager 与 NewIntegration），可参考上面“数据流与接口说明”。如果需要，我可以继续把这套接口在前端接线到对应页面并加提示与错误处理。