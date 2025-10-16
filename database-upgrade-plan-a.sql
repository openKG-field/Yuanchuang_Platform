-- ============================================
-- 数据库升级脚本 - 方案A（子任务支持）
-- 日期：2025-10-16
-- 说明：为支持复杂问题的子任务拆解流程
-- ============================================

USE user_system;

-- ============================================
-- 1. 扩展 task_manager_content 表
-- 用途：存储AI自动拆解的子任务列表
-- ============================================

-- 添加子任务列表字段
ALTER TABLE task_manager_content 
ADD COLUMN IF NOT EXISTS sub_tasks JSON COMMENT '子任务列表，存储拆解后的子任务';

-- 添加索引优化查询性能
ALTER TABLE task_manager_content 
ADD INDEX IF NOT EXISTS idx_task_name (task_name);

-- 子任务数据结构示例：
-- {
--   "subTasks": [
--     {
--       "id": "sub1",
--       "name": "流程分析",
--       "description": "分析现有业务流程",
--       "priority": "高",
--       "estimatedTime": "3天",
--       "dependencies": [],
--       "content": "AI生成的执行要点...",
--       "status": "pending"
--     }
--   ]
-- }

-- ============================================
-- 2. 扩展 new_integration_analysis 表
-- 用途：为每个子任务单独分析问题
-- ============================================

-- 添加子任务标识字段
ALTER TABLE new_integration_analysis 
ADD COLUMN IF NOT EXISTS sub_task_id VARCHAR(50) COMMENT '子任务ID',
ADD COLUMN IF NOT EXISTS sub_task_name VARCHAR(200) COMMENT '子任务名称',
ADD COLUMN IF NOT EXISTS analysis_order INT DEFAULT 1 COMMENT '分析顺序';

-- 添加联合索引
ALTER TABLE new_integration_analysis 
ADD INDEX IF NOT EXISTS idx_task_subtask (task_name, sub_task_id);

ALTER TABLE new_integration_analysis 
ADD INDEX IF NOT EXISTS idx_task_created (task_name, created_at);

-- 数据存储逻辑：
-- 原来：1个主任务 → 1条记录
-- 现在：1个主任务 + 3个子任务 → 3条记录
-- 示例：
-- INSERT INTO new_integration_analysis 
-- (task_name, sub_task_id, sub_task_name, all_issues, selected_issues, analysis_order)
-- VALUES 
-- ('优化运营效率', 'sub1', '流程分析', '问题1\n问题2', '问题1', 1);

-- ============================================
-- 3. 扩展 results_solutions 表
-- 用途：为每个子任务生成独立的AB方案
-- ============================================

-- 添加子任务和方案选择字段
ALTER TABLE results_solutions 
ADD COLUMN IF NOT EXISTS sub_task_id VARCHAR(50) COMMENT '子任务ID',
ADD COLUMN IF NOT EXISTS sub_task_name VARCHAR(200) COMMENT '子任务名称',
ADD COLUMN IF NOT EXISTS selected_solution VARCHAR(10) COMMENT '用户选择的方案：A或B',
ADD COLUMN IF NOT EXISTS solution_order INT DEFAULT 1 COMMENT '方案生成顺序';

-- 添加索引
ALTER TABLE results_solutions 
ADD INDEX IF NOT EXISTS idx_task_subtask_sol (task_name, sub_task_id);

ALTER TABLE results_solutions 
ADD INDEX IF NOT EXISTS idx_task_created (task_name, created_at);

-- 数据存储逻辑：
-- 原来：1个主任务 → 1条记录（2个方案）
-- 现在：1个主任务 + 3个子任务 → 3条记录
-- 示例：
-- INSERT INTO results_solutions 
-- (task_name, sub_task_id, sub_task_name, solution1_title, solution1_content,
--  solution2_title, solution2_content, selected_solution, solution_order)
-- VALUES 
-- ('优化运营效率', 'sub1', '流程分析', 
--  '方案A：革命式', '内容...', '方案B：增量式', '内容...', 'B', 1);

-- ============================================
-- 4. 扩展 final_result_expanded 表
-- 用途：汇总所有子任务方案并进行AI整合分析
-- ============================================

-- 添加子任务汇总和整合分析字段
ALTER TABLE final_result_expanded 
ADD COLUMN IF NOT EXISTS sub_tasks_summary JSON COMMENT '子任务方案汇总',
ADD COLUMN IF NOT EXISTS integration_analysis LONGTEXT COMMENT 'AI整合分析建议',
ADD COLUMN IF NOT EXISTS execution_plan LONGTEXT COMMENT '整体执行计划',
ADD COLUMN IF NOT EXISTS risk_warnings LONGTEXT COMMENT '风险提示';

-- 子任务汇总数据结构示例：
-- {
--   "subTasksSummary": [
--     {
--       "id": "sub1",
--       "name": "流程分析",
--       "selectedSolution": "B",
--       "solutionTitle": "增量式优化",
--       "estimatedTime": "3天",
--       "keyOutputs": "流程优化报告"
--     }
--   ],
--   "totalTime": "10天",
--   "totalCost": "5万元",
--   "criticalPath": ["sub1", "sub3", "sub4"]
-- }

-- ============================================
-- 验证查询
-- ============================================

-- 查看 task_manager_content 表结构
DESCRIBE task_manager_content;

-- 查看 new_integration_analysis 表结构
DESCRIBE new_integration_analysis;

-- 查看 results_solutions 表结构
DESCRIBE results_solutions;

-- 查看 final_result_expanded 表结构
DESCRIBE final_result_expanded;

-- 查看所有索引
SHOW INDEX FROM task_manager_content;
SHOW INDEX FROM new_integration_analysis;
SHOW INDEX FROM results_solutions;
SHOW INDEX FROM final_result_expanded;

-- ============================================
-- 测试数据示例（可选）
-- ============================================

-- 测试子任务拆解
-- INSERT INTO task_manager_content 
-- (task_name, sub_tasks, created_at)
-- VALUES 
-- ('测试任务', 
--  '{"subTasks":[{"id":"test1","name":"子任务1","status":"pending"}]}',
--  NOW());

-- 测试子任务问题分析
-- INSERT INTO new_integration_analysis 
-- (task_name, sub_task_id, sub_task_name, all_issues, selected_issues, analysis_order)
-- VALUES 
-- ('测试任务', 'test1', '子任务1', '测试问题1\n测试问题2', '测试问题1', 1);

-- 测试子任务方案
-- INSERT INTO results_solutions 
-- (task_name, sub_task_id, sub_task_name, solution1_title, solution1_content,
--  solution2_title, solution2_content, selected_solution, solution_order)
-- VALUES 
-- ('测试任务', 'test1', '子任务1', 
--  '测试方案A', '方案A内容', '测试方案B', '方案B内容', 'A', 1);

-- ============================================
-- 回滚脚本（如需回退）
-- ============================================

-- 回滚 task_manager_content
-- ALTER TABLE task_manager_content DROP COLUMN sub_tasks;
-- ALTER TABLE task_manager_content DROP INDEX idx_task_name;

-- 回滚 new_integration_analysis
-- ALTER TABLE new_integration_analysis DROP COLUMN sub_task_id;
-- ALTER TABLE new_integration_analysis DROP COLUMN sub_task_name;
-- ALTER TABLE new_integration_analysis DROP COLUMN analysis_order;
-- ALTER TABLE new_integration_analysis DROP INDEX idx_task_subtask;
-- ALTER TABLE new_integration_analysis DROP INDEX idx_task_created;

-- 回滚 results_solutions
-- ALTER TABLE results_solutions DROP COLUMN sub_task_id;
-- ALTER TABLE results_solutions DROP COLUMN sub_task_name;
-- ALTER TABLE results_solutions DROP COLUMN selected_solution;
-- ALTER TABLE results_solutions DROP COLUMN solution_order;
-- ALTER TABLE results_solutions DROP INDEX idx_task_subtask_sol;
-- ALTER TABLE results_solutions DROP INDEX idx_task_created;

-- 回滚 final_result_expanded
-- ALTER TABLE final_result_expanded DROP COLUMN sub_tasks_summary;
-- ALTER TABLE final_result_expanded DROP COLUMN integration_analysis;
-- ALTER TABLE final_result_expanded DROP COLUMN execution_plan;
-- ALTER TABLE final_result_expanded DROP COLUMN risk_warnings;

-- ============================================
-- 升级完成
-- ============================================
