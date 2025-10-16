# API接口升级记录（方案A：子任务支持）

> 记录所有为支持多子任务流程而新增或扩展的后端API接口。

---

## 1. TaskManager 子任务相关API

### 保存/更新主任务的子任务列表
- **POST** `/api/task-manager-content`
- **参数**：
  - `taskName` (string)：主任务名称
  - `subTasks` (array/object)：子任务列表（JSON）
  - 兼容原有参数：`aiResponse`、`addedTasks`、`taskDetails`、`planTasks`、`planVersions`
- **说明**：
  - 已存在则更新，否则插入

### 获取主任务的子任务列表
- **GET** `/api/task-manager-content/:taskName/subtasks`
- **返回**：
  - `{ subTasks: [...] }`

---

## 2. NewIntegration 子任务问题分析API

### 保存单个子任务的问题分析
- **POST** `/api/integration-analysis/subtask`
- **参数**：
  - `taskName` (string)：主任务名称
  - `subTaskId` (string)：子任务ID
  - `subTaskName` (string)：子任务名称
  - `allIssues` (string)：AI分析的所有问题
  - `selectedIssues` (string)：用户勾选的问题
  - `aiSolution` (string, 可选)：AI建议
  - `analysisOrder` (int, 可选)：分析顺序
- **说明**：
  - 每个子任务可多次分析，按顺序保存

### 获取主任务下所有子任务的问题分析
- **GET** `/api/integration-analysis/:taskName/all-subtasks`
- **返回**：
  - `{ analyses: [...] }`

### 获取特定子任务的问题分析
- **GET** `/api/integration-analysis/:taskName/:subTaskId`
- **返回**：
  - `{ analysis: {...} }`

---

## 3. Results 子任务方案API

### 保存单个子任务的AB方案及用户选择
- **POST** `/api/results-solution/subtask`
- **参数**：
  - `taskName` (string)：主任务名称
  - `subTaskId` (string)：子任务ID
  - `subTaskName` (string)：子任务名称
  - `selectedIssues` (string)：关联问题
  - `solution1Title` (string)：方案A标题
  - `solution1Content` (string)：方案A内容
  - `solution2Title` (string)：方案B标题
  - `solution2Content` (string)：方案B内容
  - `selectedSolution` (string)：用户选择A/B
  - `solutionOrder` (int, 可选)：方案顺序
- **说明**：
  - 每个子任务可多次保存，按顺序记录

### 获取主任务下所有子任务的方案
- **GET** `/api/results-solutions/:taskName/all-subtasks`
- **返回**：
  - `{ solutions: [...] }`

### 获取特定子任务的方案
- **GET** `/api/results-solutions/:taskName/:subTaskId`
- **返回**：
  - `{ solution: {...} }`

---

## 4. FinalResult 子任务整合API

### 保存/更新主任务的整合结果（含子任务汇总、AI整合分析等）
- **POST** `/api/final-result-expanded`
- **参数**：
  - `taskName` (string)：主任务名称
  - `methodContent` (string, 可选)：方法论内容
  - `baseContent` (string, 可选)：基础内容
  - `combinedPlan` (string, 可选)：整合方案
  - `subTasksSummary` (array/object, 可选)：子任务方案汇总（JSON）
  - `integrationAnalysis` (string, 可选)：AI整合分析
  - `executionPlan` (string, 可选)：整体执行计划
  - `riskWarnings` (string, 可选)：风险提示
- **说明**：
  - 已存在则更新，否则插入

### 获取主任务的整合结果
- **GET** `/api/final-result-expanded/:taskName`
- **返回**：
  - `{ finalResult: {...} }`

---

> 本文档已包含所有多子任务相关API接口。
