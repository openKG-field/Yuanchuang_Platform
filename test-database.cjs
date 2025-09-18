// 测试数据库数据的简单脚本
const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: 'user_system'
});

async function testData() {
  console.log('=== 数据库数据检查 ===\n');
  
  try {
    // 检查各表的数据量
    const tables = [
      'conversations',
      'ai_content', 
      'task_manager_content',
      'new_integration_analysis',
      'results_solutions',
      'visualization_assessments',
      'dialog_tasks'
    ];
    
    for (const table of tables) {
      const [rows] = await db.promise().execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`📊 ${table}: ${rows[0].count} 条记录`);
    }
    
    console.log('\n=== 具体数据示例 ===\n');
    
    // 显示任务名称
    const [tasks] = await db.promise().execute(`
      SELECT DISTINCT task_name FROM conversations 
      WHERE task_name IS NOT NULL AND task_name != '' 
      LIMIT 10
    `);
    console.log('🎯 任务名称 (来自 conversations):');
    tasks.forEach(t => console.log(`  - ${t.task_name}`));
    
    // 显示 AI 内容示例
    const [aiContent] = await db.promise().execute(`
      SELECT task_name, area, prompt 
      FROM ai_content 
      WHERE task_name IS NOT NULL 
      LIMIT 5
    `);
    console.log('\n🤖 AI 内容示例:');
    aiContent.forEach(a => console.log(`  - 任务: ${a.task_name}, 领域: ${a.area}, 提示: ${a.prompt?.slice(0, 50)}...`));
    
    // 显示对话示例
    const [convs] = await db.promise().execute(`
      SELECT task_name, user_question, ai_response 
      FROM conversations 
      WHERE task_name IS NOT NULL 
      LIMIT 3
    `);
    console.log('\n💬 对话示例:');
    convs.forEach(c => console.log(`  - 任务: ${c.task_name}\n    问: ${c.user_question?.slice(0, 50)}...\n    答: ${c.ai_response?.slice(0, 50)}...\n`));
    
  } catch (error) {
    console.error('❌ 检查数据失败:', error);
  } finally {
    db.end();
  }
}

testData();