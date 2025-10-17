# 前端改造进度记录（方案A：子任务支持）

> 记录 TaskManager.vue 及其他前端页面的改造进度

---

## ✅ 已完成：TaskManager.vue（第一步）

### 1. UI改造
- ✅ 新增"🤖 AI自动拆解"按钮（紫色渐变）
- ✅ 保留"➕ 手动添加子任务"按钮（绿色渐变）
- ✅ 优化按钮样式，支持禁用状态

### 2. 数据结构扩展
- ✅ `planTasks` 字段扩展：新增 `description`, `priority`, `estimatedTime`, `dependencies`, `status`
- ✅ 新增 `isDecomposing` 状态，防止重复点击

### 3. 核心功能实现
- ✅ `aiAutoDecompose()` 方法：
  - 调用 DeepSeek API 分析主任务
  - 自动生成3-5个子任务（JSON格式）
  - 解析AI返回结果（支持```json包裹）
  - 转换为 `planTasks` 格式
  - 保存到后端 `/api/task-manager-content`
  
- ✅ `saveSubTasksToBackend()` 方法：
  - 保存子任务到后端（subTasks字段）
  - 同时保存 taskDetails 和 addedTasks

- ✅ `loadTaskPlanFromBackend()` 方法优化：
  - 优先从新API `/api/task-manager-content/:taskName/subtasks` 加载
  - 回退到旧API `/api/task-plan/:taskName`

---

## 🚧 待完成

### TaskManager.vue（第二步）
- [ ] 子任务详情编辑面板优化
- [ ] 显示子任务优先级、预估时间等字段
- [ ] 支持编辑子任务的 description、priority 等属性
- [ ] 子任务拖拽排序功能
- [ ] 子任务删除功能

### TaskManager.vue（第三步）
- [ ] 与后端完整对接测试
- [ ] 错误处理和用户提示优化
- [ ] Loading状态优化
- [ ] 子任务状态管理（pending/in_progress/completed）

### NewIntegration.vue
- [ ] 支持逐个子任务分析问题
- [ ] 调用新API `/api/integration-analysis/subtask`
- [ ] 子任务切换导航
- [ ] 问题勾选汇总展示

### Results.vue
- [ ] 支持逐个子任务生成AB方案
- [ ] 调用新API `/api/results-solution/subtask`
- [ ] 记录用户选择的方案（A/B）
- [ ] 子任务方案汇总展示

### FinalResult.vue
- [ ] 汇总所有子任务方案
- [ ] 调用新API `/api/final-result-expanded`
- [ ] 显示 AI 整合分析建议
- [ ] 生成整体执行计划
- [ ] 风险提示展示

---

## 📊 改造进度

- TaskManager: 30% ✅
- NewIntegration: 0%
- Results: 0%
- FinalResult: 0%
- Visualization: 0%（可能不需要大改）

---

## 🔧 技术要点

### AI Prompt设计
```javascript
const prompt = `请将以下主任务拆解为3-5个具体的子任务：

主任务：${taskName}
...详情...

请按以下JSON格式返回：
[
  {
    "name": "...",
    "description": "...",
    "priority": "高/中/低",
    "estimatedTime": "...",
    "content": "..."
  }
]`;
```

### 数据流转
```
前端 planTasks → POST /api/task-manager-content → 后端 task_manager_content.sub_tasks (JSON)
后端 sub_tasks → GET /api/task-manager-content/:taskName/subtasks → 前端 planTasks
```

---

> 持续更新中...
