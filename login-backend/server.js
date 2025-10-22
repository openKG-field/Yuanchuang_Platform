const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 首先连接到MySQL服务器（不指定数据库）
const dbConnection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD
});

// 连接MySQL服务器并创建数据库
dbConnection.connect((err) => {
  if (err) {
    console.error('MySQL服务器连接失败:', err);
    console.log('请检查：');
    console.log('1. MySQL服务是否已启动');
    console.log('2. .env文件中的用户名和密码是否正确');
    return;
  }
  console.log('MySQL服务器连接成功');
  
  // 创建数据库
  dbConnection.execute('CREATE DATABASE IF NOT EXISTS user_system', (err) => {
    if (err) {
      console.error('创建数据库失败:', err);
      return;
    }
    console.log('数据库 user_system 创建成功或已存在');
    
    // 关闭初始连接
    dbConnection.end();
    
    // 重新连接到指定数据库
    setupDatabaseConnection();
  });
});

function setupDatabaseConnection() {
  // 连接到指定数据库
  const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: 'user_system'
  });

  db.connect((err) => {
    if (err) {
      console.error('数据库连接失败:', err);
      return;
    }
    console.log('数据库 user_system 连接成功');
    
    // 创建用户表
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 创建AI对话记录表
    const createConversationsTable = `
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        user_question TEXT,
        ai_response LONGTEXT,
        task_name VARCHAR(100),
        message_id INT,
        sender VARCHAR(20) NOT NULL DEFAULT '用户',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // 创建对话任务表
    const createDialogTasksTable = `
      CREATE TABLE IF NOT EXISTS dialog_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        task_name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    
    // 创建AI内容表
    const createAiContentTable = `
      CREATE TABLE IF NOT EXISTS ai_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        area TEXT,
        audience TEXT,
        keywords TEXT,
        tone TEXT,
        prompt TEXT,
        task_name VARCHAR(100),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    // 创建TaskManager内容表
    const createTaskManagerTable = `
      CREATE TABLE IF NOT EXISTS task_manager_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ai_response LONGTEXT,
        added_tasks JSON,
        task_details JSON,
        task_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    // 创建NewIntegration问题分析表
    const createNewIntegrationTable = `
      CREATE TABLE IF NOT EXISTS new_integration_analysis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_name VARCHAR(100),
        all_issues LONGTEXT NOT NULL,
        selected_issues LONGTEXT NOT NULL,
        ai_solution LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // 创建Results解决方案表
    const createResultsTable = `
      CREATE TABLE IF NOT EXISTS results_solutions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_name VARCHAR(100),
        analysis_id INT,
        selected_issues LONGTEXT,
        solution1_title VARCHAR(200),
        solution1_content LONGTEXT,
        solution2_title VARCHAR(200),
        solution2_content LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analysis_id) REFERENCES new_integration_analysis(id) ON DELETE SET NULL
      )
    `;
    
    // 创建Visualization评估表
    const createVisualizationTable = `
      CREATE TABLE IF NOT EXISTS visualization_assessments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_name VARCHAR(100) NOT NULL,
        ai_scores LONGTEXT NOT NULL,
        accuracy_score DECIMAL(3,2) DEFAULT 0.00,
        clarity_score DECIMAL(3,2) DEFAULT 0.00,
        interpretability_score DECIMAL(3,2) DEFAULT 0.00,
        innovation_score DECIMAL(3,2) DEFAULT 0.00,
        assessment_content LONGTEXT,
        radar_data JSON,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `;
    
    db.execute(createUsersTable, (err) => {
      if (err) {
        console.error('创建用户表失败:', err);
        return;
      }
      console.log('用户表创建成功或已存在');
    });

    db.execute(createConversationsTable, (err) => {
      if (err) {
        console.error('创建对话记录表失败:', err);
        return;
      }
      console.log('对话记录表创建成功或已存在');
      
      // 检查并添加新字段 - 分别添加每个字段
      db.execute(`ALTER TABLE conversations ADD COLUMN message_id INT`, 
      (alterErr1) => {
        if (alterErr1 && alterErr1.code !== 'ER_DUP_FIELDNAME') {
          console.error('添加message_id字段失败:', alterErr1.message);
        } else {
          console.log('message_id字段添加成功或已存在');
        }
      });
      
      db.execute(`ALTER TABLE conversations ADD COLUMN sender VARCHAR(20) NOT NULL DEFAULT '用户'`, 
      (alterErr2) => {
        if (alterErr2 && alterErr2.code !== 'ER_DUP_FIELDNAME') {
          console.error('添加sender字段失败:', alterErr2.message);
        } else {
          console.log('sender字段添加成功或已存在');
        }
      });
      
      db.execute(`ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`, 
      (alterErr3) => {
        if (alterErr3 && alterErr3.code !== 'ER_DUP_FIELDNAME') {
          console.error('添加updated_at字段失败:', alterErr3.message);
        } else {
          console.log('updated_at字段添加成功或已存在');
        }
      });
      
      // 修改现有字段，移除NOT NULL约束
      db.execute(`ALTER TABLE conversations MODIFY COLUMN user_question TEXT`, 
      (modifyErr1) => {
        if (modifyErr1) {
          console.error('修改user_question字段失败:', modifyErr1.message);
        } else {
          console.log('user_question字段修改成功');
        }
      });
      
      db.execute(`ALTER TABLE conversations MODIFY COLUMN ai_response LONGTEXT`, 
      (modifyErr2) => {
        if (modifyErr2) {
          console.error('修改ai_response字段失败:', modifyErr2.message);
        } else {
          console.log('ai_response字段修改成功');
        }
      });
    });

    db.execute(createDialogTasksTable, (err) => {
      if (err) {
        console.error('创建对话任务表失败:', err);
        return;
      }
      console.log('对话任务表创建成功或已存在');
    });

    db.execute(createAiContentTable, (err) => {
      if (err) {
        console.error('创建AI内容表失败:', err);
        return;
      }
      console.log('AI内容表创建成功或已存在');
    });

    db.execute(createTaskManagerTable, (err) => {
      if (err) {
        console.error('创建TaskManager内容表失败:', err);
        return;
      }
      console.log('TaskManager内容表创建成功或已存在');
      // 尝试为旧表添加计划相关字段
      db.execute(`ALTER TABLE task_manager_content ADD COLUMN plan_tasks JSON`, (e1) => {
        if (e1 && e1.code !== 'ER_DUP_FIELDNAME') {
          console.warn('添加 plan_tasks 字段失败:', e1.message);
        } else {
          console.log('plan_tasks 字段添加成功或已存在');
        }
      });
      db.execute(`ALTER TABLE task_manager_content ADD COLUMN plan_versions JSON`, (e2) => {
        if (e2 && e2.code !== 'ER_DUP_FIELDNAME') {
          console.warn('添加 plan_versions 字段失败:', e2.message);
        } else {
          console.log('plan_versions 字段添加成功或已存在');
        }
      });
      // 新增：为复杂任务拆解扩展字段
      db.execute(`ALTER TABLE task_manager_content ADD COLUMN complexity VARCHAR(20)`, (e3) => {
        if (e3 && e3.code !== 'ER_DUP_FIELDNAME') {
          console.warn('添加 complexity 字段失败:', e3.message);
        } else {
          console.log('complexity 字段添加成功或已存在');
        }
      });
      db.execute(`ALTER TABLE task_manager_content ADD COLUMN sub_tasks_json JSON`, (e4) => {
        if (e4 && e4.code !== 'ER_DUP_FIELDNAME') {
          console.warn('添加 sub_tasks_json 字段失败:', e4.message);
        } else {
          console.log('sub_tasks_json 字段添加成功或已存在');
        }
      });
      db.execute(`ALTER TABLE task_manager_content ADD COLUMN sub_tasks_count INT DEFAULT 0`, (e5) => {
        if (e5 && e5.code !== 'ER_DUP_FIELDNAME') {
          console.warn('添加 sub_tasks_count 字段失败:', e5.message);
        } else {
          console.log('sub_tasks_count 字段添加成功或已存在');
        }
      });
    });

    db.execute(createNewIntegrationTable, (err) => {
      if (err) {
        console.error('创建NewIntegration分析表失败:', err);
        return;
      }
      console.log('NewIntegration分析表创建成功或已存在');
    });

    db.execute(createResultsTable, (err) => {
      if (err) {
        console.error('创建Results解决方案表失败:', err);
        return;
      }
      console.log('Results解决方案表创建成功或已存在');
    });

    // 创建TemplateSelection记录表（保存两个方案与AI推荐方法）
    const createTemplateSelectionTable = `
      CREATE TABLE IF NOT EXISTS template_selection_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_name VARCHAR(100) NOT NULL,
        task_index INT DEFAULT NULL,
        left_content LONGTEXT,
        right_content LONGTEXT,
        left_analysis LONGTEXT,
        right_analysis LONGTEXT,
        left_method LONGTEXT,
        right_method LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    db.execute(createTemplateSelectionTable, (err) => {
      if (err) {
        console.error('创建TemplateSelection记录表失败:', err);
        return;
      }
      console.log('TemplateSelection记录表创建成功或已存在');
    });

    db.execute(createVisualizationTable, (err) => {
      if (err) {
        console.error('创建Visualization评估表失败:', err);
        return;
      }
      console.log('Visualization评估表创建成功或已存在');
    });

    // 创建FinalResult扩展表（保存整合后的完整技术方案）
    const createFinalResultExpandedTable = `
      CREATE TABLE IF NOT EXISTS final_result_expanded (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_name VARCHAR(100) NOT NULL,
        method_content LONGTEXT,
        base_content LONGTEXT,
        combined_plan LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fre_task_name (task_name, created_at)
      )
    `;
    db.execute(createFinalResultExpandedTable, (err) => {
      if (err) {
        console.error('创建final_result_expanded表失败:', err);
      } else {
        console.log('final_result_expanded表创建成功或已存在');
      }
    });

    // 新增：子任务表（存放 TaskManager 拆解的 1-5 个子任务）
    const createSubTasksTable = `
      CREATE TABLE IF NOT EXISTS sub_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_name VARCHAR(100) NOT NULL,
        sub_task_name VARCHAR(200) NOT NULL,
        description TEXT,
        difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
        task_order INT NOT NULL,
        status ENUM('pending','completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sub_tasks_task (task_name),
        INDEX idx_sub_tasks_order (task_order)
      )
    `;
    db.execute(createSubTasksTable, (err) => {
      if (err) {
        console.error('创建 sub_tasks 表失败:', err);
      } else {
        console.log('sub_tasks 表创建成功或已存在');
      }
    });

    // 新增：子任务问题表（按子任务分组的问题清单）
    const createTaskProblemsTable = `
      CREATE TABLE IF NOT EXISTS task_problems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_name VARCHAR(100) NOT NULL,
        sub_task_id INT,
        sub_task_name VARCHAR(200),
        problem_description TEXT NOT NULL,
        is_critical BOOLEAN DEFAULT FALSE,
        is_selected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tp_task (task_name),
        INDEX idx_tp_sub (sub_task_id),
        CONSTRAINT fk_tp_sub FOREIGN KEY (sub_task_id) REFERENCES sub_tasks(id) ON DELETE CASCADE
      )
    `;
    db.execute(createTaskProblemsTable, (err) => {
      if (err) {
        console.error('创建 task_problems 表失败:', err);
      } else {
        console.log('task_problems 表创建成功或已存在');
      }
    });
  });

  // 注册接口
  app.post('/api/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: '用户名和密码不能为空' });
      }
      
      // 检查用户是否已存在
      const [existingUsers] = await db.promise().execute(
        'SELECT * FROM users WHERE username = ?', [username]
      );
      
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: '用户名已存在' });
      }
      
      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // 插入新用户
      await db.promise().execute(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword]
      );
      
      console.log('用户注册成功:', username);
      res.status(201).json({ message: '注册成功' });
    } catch (error) {
      console.error('注册错误:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 登录接口
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: '用户名和密码不能为空' });
      }
      
      // 查找用户
      const [users] = await db.promise().execute(
        'SELECT * FROM users WHERE username = ?', [username]
      );
      
      if (users.length === 0) {
        return res.status(401).json({ message: '用户名或密码错误' });
      }
      
      const user = users[0];
      
      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: '用户名或密码错误' });
      }
      
      // 生成JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'default-secret-key',
        { expiresIn: '24h' }
      );
      
      console.log('用户登录成功:', username);
      res.json({
        message: '登录成功',
        token,
        user: { id: user.id, username: user.username }
      });
    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 测试接口
  app.get('/api/test', (req, res) => {
    res.json({ message: '服务器运行正常' });
  });

  // 保存AI对话记录接口
  app.post('/api/conversations', async (req, res) => {
    try {
      const { userId, userQuestion, aiResponse, taskName } = req.body;
      
      if (!userId || !userQuestion || !aiResponse) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      await db.promise().execute(
        'INSERT INTO conversations (user_id, user_question, ai_response, task_name) VALUES (?, ?, ?, ?)',
        [userId, userQuestion, aiResponse, taskName || '未命名任务']
      );
      
      console.log('对话记录保存成功');
      res.status(201).json({ message: '对话记录保存成功' });
    } catch (error) {
      console.error('保存对话记录失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 获取用户所有对话记录接口
  app.get('/api/conversations/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const [conversations] = await db.promise().execute(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      
      res.json({
        success: true,
        conversations: conversations
      });
    } catch (error) {
      console.error('获取对话记录失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 获取所有对话记录接口（用于流程图显示）
  app.get('/api/conversations', async (req, res) => {
    try {
      const [conversations] = await db.promise().execute(`
        SELECT c.*, u.username 
        FROM conversations c 
        LEFT JOIN users u ON c.user_id = u.id 
        ORDER BY c.created_at DESC
      `);
      
      res.json({
        success: true,
        conversations: conversations
      });
    } catch (error) {
      console.error('获取所有对话记录失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // ===== 对话任务管理相关接口 =====
  
  // 创建新的对话任务
  app.post('/api/dialog-tasks', async (req, res) => {
    try {
      const { userId, taskName } = req.body;
      
      if (!userId || !taskName) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      // 将其他任务设为非活跃状态
      await db.promise().execute(
        'UPDATE dialog_tasks SET is_active = FALSE WHERE user_id = ?',
        [userId]
      );
      
      // 创建新任务
      const [result] = await db.promise().execute(
        'INSERT INTO dialog_tasks (user_id, task_name, is_active) VALUES (?, ?, TRUE)',
        [userId, taskName]
      );
      
      console.log('对话任务创建成功，ID:', result.insertId);
      res.status(201).json({ 
        success: true,
        id: result.insertId,
        message: '任务创建成功' 
      });
    } catch (error) {
      console.error('创建对话任务失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 获取用户的所有对话任务
  app.get('/api/dialog-tasks/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const [tasks] = await db.promise().execute(
        'SELECT * FROM dialog_tasks WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      
      res.json({
        success: true,
        tasks: tasks
      });
    } catch (error) {
      console.error('获取对话任务失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 设置活跃任务
  app.put('/api/dialog-tasks/active', async (req, res) => {
    try {
      const { userId, taskId } = req.body;
      
      if (!userId || !taskId) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      // 将所有任务设为非活跃状态
      await db.promise().execute(
        'UPDATE dialog_tasks SET is_active = FALSE WHERE user_id = ?',
        [userId]
      );
      
      // 设置指定任务为活跃状态
      const [result] = await db.promise().execute(
        'UPDATE dialog_tasks SET is_active = TRUE WHERE id = ? AND user_id = ?',
        [taskId, userId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '未找到要更新的任务' });
      }
      
      res.json({ 
        success: true,
        message: '活跃任务设置成功' 
      });
    } catch (error) {
      console.error('设置活跃任务失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 删除对话任务
  app.delete('/api/dialog-tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: '缺少用户ID参数' });
      }
      
      // 删除任务相关的对话记录
      await db.promise().execute(
        'DELETE FROM conversations WHERE task_name = (SELECT task_name FROM dialog_tasks WHERE id = ? AND user_id = ?)',
        [taskId, userId]
      );
      
      // 删除任务
      const [result] = await db.promise().execute(
        'DELETE FROM dialog_tasks WHERE id = ? AND user_id = ?',
        [taskId, userId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '未找到要删除的任务' });
      }
      
      res.json({ 
        success: true,
        message: '任务删除成功' 
      });
    } catch (error) {
      console.error('删除对话任务失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 按任务名删除任务及相关数据（供前端侧边栏垃圾桶使用）
  app.delete('/api/tasks/by-name/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      const decodedName = decodeURIComponent(taskName);
      if (!decodedName) {
        return res.status(400).json({ success: false, message: '缺少任务名称' });
      }

      // 删除与该任务相关的各表数据（根据现有表结构）
      // 注意：这些表未全部建立外键，需手动清理
      const queries = [
        // 对话记录
        db.promise().execute('DELETE FROM conversations WHERE task_name = ?', [decodedName]),
        // 对话任务表
        db.promise().execute('DELETE FROM dialog_tasks WHERE task_name = ?', [decodedName]),
        // AI 内容
        db.promise().execute('DELETE FROM ai_content WHERE task_name = ?', [decodedName]),
        // TaskManager 内容（含 plan_*）
        db.promise().execute('DELETE FROM task_manager_content WHERE task_name = ?', [decodedName]),
        // 子任务与问题
        db.promise().execute('DELETE FROM task_problems WHERE task_name = ?', [decodedName]),
        db.promise().execute('DELETE FROM sub_tasks WHERE task_name = ?', [decodedName]),
        // NewIntegration 分析（先删 results 外键依赖）
        db.promise().execute('DELETE FROM results_solutions WHERE task_name = ?', [decodedName]),
        db.promise().execute('DELETE FROM new_integration_analysis WHERE task_name = ?', [decodedName]),
        // Visualization 评估
  db.promise().execute('DELETE FROM visualization_assessments WHERE task_name = ?', [decodedName]),
  db.promise().execute('DELETE FROM final_result_expanded WHERE task_name = ?', [decodedName]),
  // TemplateSelection 记录
  db.promise().execute('DELETE FROM template_selection_records WHERE task_name = ?', [decodedName])
      ];

      await Promise.all(queries);

      res.json({ success: true, message: '任务及相关数据已删除' });
    } catch (error) {
      console.error('按任务名删除失败:', error);
      res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
  });

  // 保存单条对话消息
  app.post('/api/dialog-messages', async (req, res) => {
    try {
      const { userId, taskName, messageId, sender, content } = req.body;
      
      if (!userId || !taskName || !sender || !content) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      // 根据sender类型设置不同的字段
      const userQuestion = sender === '你' ? content : '';
      const aiResponse = sender === 'AI' ? content : '';
      
      const [result] = await db.promise().execute(
        'INSERT INTO conversations (user_id, user_question, ai_response, task_name, message_id, sender) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, userQuestion, aiResponse, taskName, messageId, sender]
      );
      
      res.status(201).json({ 
        success: true,
        id: result.insertId,
        message: '消息保存成功' 
      });
    } catch (error) {
      console.error('保存对话消息失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 获取指定任务的所有对话消息
  app.get('/api/dialog-messages/:userId/:taskName', async (req, res) => {
    try {
      const { userId, taskName } = req.params;
      
      const [messages] = await db.promise().execute(
        'SELECT * FROM conversations WHERE user_id = ? AND task_name = ? ORDER BY created_at ASC',
        [userId, decodeURIComponent(taskName)]
      );
      
      // 转换为前端需要的格式
      const formattedMessages = messages.map(msg => ({
        id: msg.message_id || msg.id,
        text: msg.sender === 'AI' ? msg.ai_response : msg.user_question,
        sender: msg.sender,
        dbId: msg.id,
        created_at: msg.created_at
      }));
      
      res.json({
        success: true,
        messages: formattedMessages
      });
    } catch (error) {
      console.error('获取对话消息失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 更新对话消息内容
  app.put('/api/dialog-messages/:messageDbId', async (req, res) => {
    try {
      const { messageDbId } = req.params;
      const { content, sender } = req.body;
      
      console.log('收到更新请求 - messageDbId:', messageDbId, 'content:', content?.substring(0, 50) + '...', 'sender:', sender);
      
      if (!messageDbId || messageDbId === 'undefined') {
        console.error('messageDbId无效:', messageDbId);
        return res.status(400).json({ message: 'messageDbId参数无效' });
      }
      
      if (!content || !sender) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      // 根据sender类型更新不同的字段
      const updateField = sender === 'AI' ? 'ai_response' : 'user_question';
      const [result] = await db.promise().execute(
        `UPDATE conversations SET ${updateField} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [content, messageDbId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '未找到要更新的消息' });
      }
      
      res.json({ 
        success: true,
        message: '消息更新成功' 
      });
    } catch (error) {
      console.error('更新对话消息失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 获取用户当前活跃任务
  app.get('/api/dialog-tasks/active/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const [tasks] = await db.promise().execute(
        'SELECT * FROM dialog_tasks WHERE user_id = ? AND is_active = TRUE LIMIT 1',
        [userId]
      );
      
      res.json({
        success: true,
        activeTask: tasks.length > 0 ? tasks[0] : null
      });
    } catch (error) {
      console.error('获取活跃任务失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 保存AI生成内容接口
  app.post('/api/save-content', async (req, res) => {
    try {
      const { area, audience, keywords, tone, prompt, taskName } = req.body;
      
      if (!area || !audience || !keywords || !tone || !prompt) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      const [result] = await db.promise().execute(
        'INSERT INTO ai_content (area, audience, keywords, tone, prompt, task_name) VALUES (?, ?, ?, ?, ?, ?)',
        [area, audience, keywords, tone, prompt, taskName || '未命名任务']
      );
      
      console.log('AI内容保存成功，ID:', result.insertId);
      res.status(201).json({ 
        success: true,
        id: result.insertId,
        message: '内容保存成功' 
      });
    } catch (error) {
      console.error('保存AI内容失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 更新AI生成内容接口
  app.put('/api/update-content', async (req, res) => {
    try {
      const { id, area, audience, keywords, tone, prompt, taskName } = req.body;
      
      if (!id || !area || !audience || !keywords || !tone || !prompt) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      const [result] = await db.promise().execute(
        'UPDATE ai_content SET area = ?, audience = ?, keywords = ?, tone = ?, prompt = ?, task_name = ? WHERE id = ?',
        [area, audience, keywords, tone, prompt, taskName || '未命名任务', id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '未找到要更新的记录' });
      }
      
      console.log('AI内容更新成功，ID:', id);
      res.json({ 
        success: true,
        message: '内容更新成功' 
      });
    } catch (error) {
      console.error('更新AI内容失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 获取所有AI内容接口
  app.get('/api/ai-content', async (req, res) => {
    try {
      const [aiContents] = await db.promise().execute(`
        SELECT * FROM ai_content 
        ORDER BY timestamp DESC
      `);
      
      res.json({
        success: true,
        aiContents: aiContents
      });
    } catch (error) {
      console.error('获取AI内容失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 根据任务名称获取AI内容接口
  app.get('/api/ai-content/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      
      const [aiContents] = await db.promise().execute(
        'SELECT * FROM ai_content WHERE task_name = ? ORDER BY timestamp DESC',
        [taskName]
      );
      
      res.json({
        success: true,
        aiContents: aiContents
      });
    } catch (error) {
      console.error('获取任务AI内容失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 保存TaskManager内容接口
  app.post('/api/save-task-manager', async (req, res) => {
    try {
      const { aiResponse, addedTasks, taskDetails, taskName } = req.body;
      const aiResp = aiResponse || '';
      if (!taskDetails) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      const [result] = await db.promise().execute(
        'INSERT INTO task_manager_content (ai_response, added_tasks, task_details, task_name) VALUES (?, ?, ?, ?)',
        [
          aiResp, 
          JSON.stringify(addedTasks || []), 
          JSON.stringify(taskDetails || {}), 
          taskName || '未命名任务'
        ]
      );
      
      console.log('TaskManager内容保存成功，ID:', result.insertId);
      res.status(201).json({ 
        success: true,
        id: result.insertId,
        message: 'TaskManager内容保存成功' 
      });
    } catch (error) {
      console.error('保存TaskManager内容失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 更新TaskManager内容接口
  app.put('/api/update-task-manager/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { aiResponse, addedTasks, taskDetails, taskName } = req.body;
      const aiResp = aiResponse || '';
      if (!id) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      const [result] = await db.promise().execute(
        'UPDATE task_manager_content SET ai_response = ?, added_tasks = ?, task_details = ?, task_name = ? WHERE id = ?',
        [
          aiResp, 
          JSON.stringify(addedTasks || []), 
          JSON.stringify(taskDetails || {}), 
          taskName || '未命名任务',
          id
        ]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '未找到要更新的记录' });
      }
      
      console.log('TaskManager内容更新成功，ID:', id);
      res.json({ 
        success: true,
        message: 'TaskManager内容更新成功' 
      });
    } catch (error) {
      console.error('更新TaskManager内容失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // ===== 任务规划 Plan（使用旧表 task_manager_content 承载）=====
  // 保存或更新任务规划（按 task_name upsert）
  app.post('/api/task-plan/save', async (req, res) => {
    try {
      const { taskName, planTasks } = req.body;
      if (!taskName || !Array.isArray(planTasks)) {
        return res.status(400).json({ success: false, message: 'taskName 或 planTasks 无效' });
      }

      // 查询是否已有记录
      const [rows] = await db.promise().execute(
        'SELECT id, plan_tasks FROM task_manager_content WHERE task_name = ? ORDER BY created_at DESC LIMIT 1',
        [taskName]
      );

      if (rows.length > 0) {
        const id = rows[0].id;
        // 合并：保留已有的其它子任务，仅更新/新增同 id 项
        let existing = [];
        try { existing = JSON.parse(rows[0].plan_tasks || '[]'); } catch (_) { existing = []; }
        const map = new Map();
        for (const t of Array.isArray(existing) ? existing : []) {
          if (t && t.id != null) map.set(String(t.id), t);
        }
        for (const t of planTasks) {
          if (t && t.id != null) map.set(String(t.id), { ...map.get(String(t.id)), ...t });
        }
        const merged = Array.from(map.values());
        await db.promise().execute(
          'UPDATE task_manager_content SET plan_tasks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [JSON.stringify(merged), id]
        );
        return res.json({ success: true, id, message: '任务规划已更新（合并）' });
      } else {
        const [result] = await db.promise().execute(
          'INSERT INTO task_manager_content (task_name, plan_tasks) VALUES (?, ?)',
          [taskName, JSON.stringify(planTasks)]
        );
        return res.status(201).json({ success: true, id: result.insertId, message: '任务规划已创建' });
      }
    } catch (error) {
      console.error('保存任务规划失败:', error);
      res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
  });

  // 获取任务规划（优先选择包含 plan_tasks 的最新记录）
  app.get('/api/task-plan/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      let [rows] = await db.promise().execute(
        `SELECT id, plan_tasks FROM task_manager_content 
         WHERE task_name = ? AND plan_tasks IS NOT NULL 
         ORDER BY updated_at DESC, created_at DESC LIMIT 1`,
        [taskName]
      );
      if (rows.length === 0) {
        // 回退到最新一条记录
        [rows] = await db.promise().execute(
      'SELECT id, plan_tasks FROM task_manager_content WHERE task_name = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1',
          [taskName]
        );
      }
    if (rows.length === 0) return res.json({ success: true, id: null, tasks: [] });
      let tasks = [];
      try { tasks = JSON.parse(rows[0].plan_tasks || '[]'); } catch (_) {}
    res.json({ success: true, id: rows[0].id, tasks });
    } catch (error) {
      console.error('获取任务规划失败:', error);
      res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
  });

  // 编辑单个子任务内容（写入版本）
  app.put('/api/task-plan/:taskName/edit', async (req, res) => {
    try {
      const { taskName } = req.params;
      const { subTaskId, subTaskName, content, editor, note } = req.body;
      if (!taskName || (!subTaskId && !subTaskName) || typeof content !== 'string') {
        return res.status(400).json({ success: false, message: '参数无效' });
      }

      let [rows] = await db.promise().execute(
        `SELECT id, plan_tasks, plan_versions FROM task_manager_content 
         WHERE task_name = ? AND plan_tasks IS NOT NULL 
         ORDER BY updated_at DESC, created_at DESC LIMIT 1`,
        [taskName]
      );
      if (rows.length === 0) {
        // 回退到最新一条记录
        [rows] = await db.promise().execute(
          'SELECT id, plan_tasks, plan_versions FROM task_manager_content WHERE task_name = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1',
          [taskName]
        );
      }
      if (rows.length === 0) return res.status(404).json({ success: false, message: '未找到任务记录' });
      const row = rows[0];
      let tasks = [];
      let versions = {};
      try { tasks = JSON.parse(row.plan_tasks || '[]'); } catch (_) {}
      try { versions = JSON.parse(row.plan_versions || '{}'); } catch (_) {}

      let idx = -1;
      if (subTaskId) {
        idx = tasks.findIndex(t => String(t.id) === String(subTaskId));
      }
      if (idx === -1 && subTaskName) {
        idx = tasks.findIndex(t => t.name === subTaskName);
      }
      // 如果依然未找到且提供了名称，则自动补建该子任务以避免 404
      if (idx === -1 && subTaskName) {
        const newId = subTaskId || subTaskName; // 优先沿用传入的 id，否则以名称作为 id
        const newTask = { id: newId, name: subTaskName, content: '' };
        tasks.push(newTask);
        idx = tasks.length - 1;
      }
      if (idx === -1) {
        return res.status(404).json({ success: false, message: '未找到子任务' });
      }

      // 版本追加
  const ts = new Date().toISOString();
  const versionKey = String(tasks[idx].id);
  const versionEntry = { id: versionKey, ts, content, editor: editor || null, note: note || '' };
  if (!Array.isArray(versions[versionKey])) versions[versionKey] = [];
  versions[versionKey].push(versionEntry);

      // 更新当前内容
      tasks[idx].content = content;

      await db.promise().execute(
        'UPDATE task_manager_content SET plan_tasks = ?, plan_versions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(tasks), JSON.stringify(versions), row.id]
      );

  res.json({ success: true, message: '子任务已更新', tasks, versions: versions[versionKey] });
    } catch (error) {
      console.error('编辑子任务失败:', error);
      res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
  });

  // 获取某子任务版本历史
  app.get('/api/task-plan/:taskName/versions', async (req, res) => {
    try {
      const { taskName } = req.params;
      const { subTaskId } = req.query;
      if (!subTaskId) return res.status(400).json({ success: false, message: '缺少subTaskId' });
      let [rows] = await db.promise().execute(
        `SELECT plan_versions FROM task_manager_content 
         WHERE task_name = ? AND (plan_versions IS NOT NULL OR plan_tasks IS NOT NULL)
         ORDER BY updated_at DESC, created_at DESC LIMIT 1`,
        [taskName]
      );
      if (rows.length === 0) return res.json({ success: true, versions: [] });
      let versions = {};
      try { versions = JSON.parse(rows[0].plan_versions || '{}'); } catch (_) {}
      const key = String(subTaskId);
      res.json({ success: true, versions: versions[key] || [] });
    } catch (error) {
      console.error('获取版本历史失败:', error);
      res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
  });

  // 获取所有TaskManager内容接口
  app.get('/api/task-manager-content', async (req, res) => {
    try {
      const [taskManagerContents] = await db.promise().execute(`
        SELECT * FROM task_manager_content 
        ORDER BY created_at DESC
      `);
      
      // 解析JSON字段，添加错误处理
      const parsedContents = taskManagerContents.map(content => {
        let addedTasks = [];
        let taskDetails = {};
        
        // 安全解析 added_tasks
        try {
          if (content.added_tasks) {
            // 如果是字符串，尝试JSON解析
            if (typeof content.added_tasks === 'string') {
              // 处理JavaScript数组字面量格式 ['item1', 'item2']
              let cleanedTasks = content.added_tasks.trim();
              if (cleanedTasks.startsWith('[') && cleanedTasks.endsWith(']')) {
                // 尝试直接解析
                try {
                  addedTasks = JSON.parse(cleanedTasks);
                } catch {
                  // 如果失败，尝试修复单引号问题
                  cleanedTasks = cleanedTasks.replace(/'/g, '"');
                  addedTasks = JSON.parse(cleanedTasks);
                }
              } else {
                addedTasks = JSON.parse(content.added_tasks);
              }
            } else {
              // 如果已经是数组，直接使用
              addedTasks = content.added_tasks;
            }
          }
        } catch (e) {
          console.warn(`解析 added_tasks 失败 (ID: ${content.id}):`, e.message);
          console.warn('原始数据:', content.added_tasks);
          // 尝试作为简单字符串处理
          if (typeof content.added_tasks === 'string' && content.added_tasks.trim()) {
            addedTasks = [content.added_tasks.trim()];
          } else {
            addedTasks = [];
          }
        }
        
        // 安全解析 task_details
        try {
          if (content.task_details) {
            // 如果是字符串，尝试JSON解析
            if (typeof content.task_details === 'string') {
              taskDetails = JSON.parse(content.task_details);
            } else {
              // 如果已经是对象，直接使用
              taskDetails = content.task_details;
            }
          }
        } catch (e) {
          console.warn(`解析 task_details 失败 (ID: ${content.id}):`, e.message);
          console.warn('原始数据:', content.task_details);
          // 如果解析失败，尝试直接使用原始数据作为对象
          if (content.task_details && typeof content.task_details === 'object') {
            taskDetails = content.task_details;
          } else {
            taskDetails = {};
          }
        }
        
        return {
          ...content,
          added_tasks: addedTasks,
          task_details: taskDetails
        };
      });
      
      res.json({
        success: true,
        taskManagerContents: parsedContents
      });
    } catch (error) {
      console.error('获取TaskManager内容失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 根据任务名称获取TaskManager内容接口
  app.get('/api/task-manager-content/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      
      const [taskManagerContents] = await db.promise().execute(
        'SELECT * FROM task_manager_content WHERE task_name = ? ORDER BY created_at DESC',
        [taskName]
      );
      
      // 解析JSON字段，添加错误处理
      const parsedContents = taskManagerContents.map(content => {
        let addedTasks = [];
        let taskDetails = {};
        
        // 安全解析 added_tasks
        try {
          if (content.added_tasks) {
            // 如果是字符串，尝试JSON解析
            if (typeof content.added_tasks === 'string') {
              // 处理JavaScript数组字面量格式 ['item1', 'item2']
              let cleanedTasks = content.added_tasks.trim();
              if (cleanedTasks.startsWith('[') && cleanedTasks.endsWith(']')) {
                // 尝试直接解析
                try {
                  addedTasks = JSON.parse(cleanedTasks);
                } catch {
                  // 如果失败，尝试修复单引号问题
                  cleanedTasks = cleanedTasks.replace(/'/g, '"');
                  addedTasks = JSON.parse(cleanedTasks);
                }
              } else {
                addedTasks = JSON.parse(content.added_tasks);
              }
            } else {
              // 如果已经是数组，直接使用
              addedTasks = content.added_tasks;
            }
          }
        } catch (e) {
          console.warn(`解析 added_tasks 失败 (ID: ${content.id}):`, e.message);
          console.warn('原始数据:', content.added_tasks);
          // 尝试作为简单字符串处理
          if (typeof content.added_tasks === 'string' && content.added_tasks.trim()) {
            addedTasks = [content.added_tasks.trim()];
          } else {
            addedTasks = [];
          }
        }
        
        // 安全解析 task_details
        try {
          if (content.task_details) {
            // 如果是字符串，尝试JSON解析
            if (typeof content.task_details === 'string') {
              taskDetails = JSON.parse(content.task_details);
            } else {
              // 如果已经是对象，直接使用
              taskDetails = content.task_details;
            }
          }
        } catch (e) {
          console.warn(`解析 task_details 失败 (ID: ${content.id}):`, e.message);
          console.warn('原始数据:', content.task_details);
          // 如果解析失败，尝试直接使用原始数据作为对象
          if (content.task_details && typeof content.task_details === 'object') {
            taskDetails = content.task_details;
          } else {
            taskDetails = {};
          }
        }
        
        return {
          ...content,
          added_tasks: addedTasks,
          task_details: taskDetails
        };
      });
      
      res.json({
        success: true,
        taskManagerContents: parsedContents
      });
    } catch (error) {
      console.error('获取任务TaskManager内容失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 根据ID获取单个TaskManager内容接口
  app.get('/api/task-manager-content/id/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const [taskManagerContents] = await db.promise().execute(
        'SELECT * FROM task_manager_content WHERE id = ?',
        [id]
      );
      
      if (taskManagerContents.length === 0) {
        return res.status(404).json({ message: '未找到指定的记录' });
      }
      
      // 解析JSON字段，使用增强的错误处理
      const content = taskManagerContents[0];
      let addedTasks = [];
      let taskDetails = {};
      
      // 安全解析 added_tasks
      try {
        if (content.added_tasks) {
          if (typeof content.added_tasks === 'string') {
            let cleanedTasks = content.added_tasks.trim();
            if (cleanedTasks.startsWith('[') && cleanedTasks.endsWith(']')) {
              try {
                addedTasks = JSON.parse(cleanedTasks);
              } catch {
                cleanedTasks = cleanedTasks.replace(/'/g, '"');
                addedTasks = JSON.parse(cleanedTasks);
              }
            } else {
              addedTasks = JSON.parse(content.added_tasks);
            }
          } else {
            addedTasks = content.added_tasks;
          }
        }
      } catch (e) {
        console.warn(`解析 added_tasks 失败 (ID: ${content.id}):`, e.message);
        if (typeof content.added_tasks === 'string' && content.added_tasks.trim()) {
          addedTasks = [content.added_tasks.trim()];
        } else {
          addedTasks = [];
        }
      }
      
      // 安全解析 task_details
      try {
        if (content.task_details) {
          if (typeof content.task_details === 'string') {
            taskDetails = JSON.parse(content.task_details);
          } else {
            taskDetails = content.task_details;
          }
        }
      } catch (e) {
        console.warn(`解析 task_details 失败 (ID: ${content.id}):`, e.message);
        if (content.task_details && typeof content.task_details === 'object') {
          taskDetails = content.task_details;
        } else {
          taskDetails = {};
        }
      }
      
      const parsedContent = {
        ...content,
        added_tasks: addedTasks,
        task_details: taskDetails
      };
      
      res.json({
        success: true,
        taskManagerContent: parsedContent
      });
    } catch (error) {
      console.error('获取TaskManager内容失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 保存NewIntegration问题分析接口
  app.post('/api/save-integration-analysis', async (req, res) => {
    try {
      const { taskName, allIssues, selectedIssues, aiSolution } = req.body;
      
      if (!allIssues || !selectedIssues) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      const [result] = await db.promise().execute(
        'INSERT INTO new_integration_analysis (task_name, all_issues, selected_issues, ai_solution) VALUES (?, ?, ?, ?)',
        [
          taskName || '未命名任务',
          allIssues,
          selectedIssues,
          aiSolution || ''
        ]
      );
      
      console.log('NewIntegration分析保存成功，ID:', result.insertId);
      res.status(201).json({ 
        success: true,
        id: result.insertId,
        message: 'NewIntegration分析保存成功' 
      });
    } catch (error) {
      console.error('保存NewIntegration分析失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 获取所有NewIntegration分析记录接口
  app.get('/api/integration-analysis', async (req, res) => {
    try {
      const [analysisRecords] = await db.promise().execute(`
        SELECT * FROM new_integration_analysis 
        ORDER BY created_at DESC
      `);
      
      res.json({
        success: true,
        analysisRecords: analysisRecords
      });
    } catch (error) {
      console.error('获取NewIntegration分析记录失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 根据任务名称获取NewIntegration分析记录接口
  app.get('/api/integration-analysis/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      
      const [analysisRecords] = await db.promise().execute(
        'SELECT * FROM new_integration_analysis WHERE task_name = ? ORDER BY created_at DESC',
        [taskName]
      );
      
      res.json({
        success: true,
        analysisRecords: analysisRecords
      });
    } catch (error) {
      console.error('获取任务NewIntegration分析记录失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 根据ID获取单个NewIntegration分析记录接口
  app.get('/api/integration-analysis/id/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const [analysisRecords] = await db.promise().execute(
        'SELECT * FROM new_integration_analysis WHERE id = ?',
        [id]
      );
      
      if (analysisRecords.length === 0) {
        return res.status(404).json({ message: '未找到指定的记录' });
      }
      
      res.json({
        success: true,
        analysisRecord: analysisRecords[0]
      });
    } catch (error) {
      console.error('获取NewIntegration分析记录失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 更新NewIntegration分析记录接口
  app.put('/api/integration-analysis/id/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { aiSolution } = req.body;
      
      if (!id || !aiSolution) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      const [result] = await db.promise().execute(
        'UPDATE new_integration_analysis SET ai_solution = ? WHERE id = ?',
        [aiSolution, id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: '未找到要更新的记录' });
      }
      
      console.log('NewIntegration分析记录更新成功，ID:', id);
      res.json({ 
        success: true,
        message: 'NewIntegration分析记录更新成功' 
      });
    } catch (error) {
      console.error('更新NewIntegration分析记录失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 保存Results解决方案接口
  app.post('/api/save-results', async (req, res) => {
    try {
      const { 
        taskName, 
        analysisId, 
        selectedIssues, 
        solution1Title, 
        solution1Content, 
        solution2Title, 
        solution2Content 
      } = req.body;
      
      if (!selectedIssues || !solution1Content || !solution2Content) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      const [result] = await db.promise().execute(
        'INSERT INTO results_solutions (task_name, analysis_id, selected_issues, solution1_title, solution1_content, solution2_title, solution2_content) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          taskName || '未命名任务',
          analysisId || null,
          selectedIssues,
          solution1Title || '目标解决方案一',
          solution1Content,
          solution2Title || '目标解决方案二',
          solution2Content
        ]
      );
      
      console.log('Results解决方案保存成功，ID:', result.insertId);
      res.status(201).json({ 
        success: true,
        id: result.insertId,
        message: 'Results解决方案保存成功' 
      });
    } catch (error) {
      console.error('保存Results解决方案失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 获取所有Results解决方案记录接口
  app.get('/api/results-solutions', async (req, res) => {
    try {
      const [solutions] = await db.promise().execute(`
        SELECT rs.*, nia.all_issues 
        FROM results_solutions rs 
        LEFT JOIN new_integration_analysis nia ON rs.analysis_id = nia.id 
        ORDER BY rs.created_at DESC
      `);
      
      res.json({
        success: true,
        solutions: solutions
      });
    } catch (error) {
      console.error('获取Results解决方案记录失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 根据任务名称获取Results解决方案记录接口
  app.get('/api/results-solutions/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      
      const [solutions] = await db.promise().execute(`
        SELECT rs.*, nia.all_issues 
        FROM results_solutions rs 
        LEFT JOIN new_integration_analysis nia ON rs.analysis_id = nia.id 
        WHERE rs.task_name = ? 
        ORDER BY rs.created_at DESC
      `, [taskName]);
      
      res.json({
        success: true,
        solutions: solutions
      });
    } catch (error) {
      console.error('获取任务Results解决方案记录失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 根据ID获取单个Results解决方案记录接口
  app.get('/api/results-solutions/id/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const [solutions] = await db.promise().execute(`
        SELECT rs.*, nia.all_issues 
        FROM results_solutions rs 
        LEFT JOIN new_integration_analysis nia ON rs.analysis_id = nia.id 
        WHERE rs.id = ?
      `, [id]);
      
      if (solutions.length === 0) {
        return res.status(404).json({ message: '未找到指定的记录' });
      }
      
      res.json({
        success: true,
        solution: solutions[0]
      });
    } catch (error) {
      console.error('获取Results解决方案记录失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // ===== FinalResult 扩展：保存与获取整合方案 =====
  // 保存（插入新记录）
  app.post('/api/final-result-expanded/save', async (req, res) => {
    try {
      const { taskName, methodContent, baseContent, combinedPlan } = req.body;
      if (!taskName || !combinedPlan) {
        return res.status(400).json({ success: false, message: 'taskName 与 combinedPlan 不能为空' });
      }
      await db.promise().execute(
        `INSERT INTO final_result_expanded (task_name, method_content, base_content, combined_plan)
         VALUES (?, ?, ?, ?)`,
        [taskName, methodContent || null, baseContent || null, combinedPlan]
      );
      res.status(201).json({ success: true, message: '保存成功' });
    } catch (error) {
      console.error('保存整合方案失败:', error);
      res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
  });

  // 获取指定任务最新整合方案
  app.get('/api/final-result-expanded/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      const [rows] = await db.promise().execute(
        `SELECT * FROM final_result_expanded WHERE task_name = ? 
         ORDER BY created_at DESC LIMIT 1`,
        [decodeURIComponent(taskName)]
      );
      if (!rows || rows.length === 0) {
        return res.json({ success: true, record: null });
      }
      res.json({ success: true, record: rows[0] });
    } catch (error) {
      console.error('获取整合方案失败:', error);
      res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
  });

  // ===== Streaming 生成完整技术方案（SSE转发） =====
  const https = require('https');
  // 简单非流式 AI 代理：/api/ai 供前端一次性获取结果
  app.post('/api/ai', async (req, res) => {
    try {
      const { model, messages, max_tokens } = req.body || {};
      if (!Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: 'messages 必须为数组' });
      }
      // 优先使用前端传入的 Authorization；否则使用服务端环境变量中的密钥
      const serverKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.QINIU_OPENAI_KEY;
      const auth = req.headers['authorization'] || (serverKey ? `Bearer ${serverKey}` : undefined);
      const upstreamBody = JSON.stringify({
        model: model || 'deepseek-v3',
        messages,
        max_tokens: max_tokens || 1500
      });
      const options = {
        hostname: 'openai.qiniu.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(upstreamBody),
          ...(auth ? { 'Authorization': auth } : {})
        }
      };
      const upstreamReq = https.request(options, (upRes) => {
        let raw = '';
        upRes.on('data', chunk => raw += chunk);
        upRes.on('end', () => {
          if (upRes.statusCode && upRes.statusCode >= 400) {
            return res.status(upRes.statusCode).json({ success:false, message:'上游错误', status: upRes.statusCode, body: raw });
          }
          try {
            const parsed = JSON.parse(raw);
            res.json(parsed);
          } catch (e) {
            res.status(502).json({ success:false, message:'解析上游响应失败', raw });
          }
        });
      });
      upstreamReq.on('error', (err) => {
        console.error('非流式上游错误:', err.message);
        res.status(500).json({ success:false, message: err.message });
      });
      upstreamReq.write(upstreamBody);
      upstreamReq.end();
    } catch (error) {
      console.error('调用 /api/ai 失败:', error);
      res.status(500).json({ success:false, message: error.message });
    }
  });
  app.post('/api/combined-plan/stream', async (req, res) => {
    try {
      const { model, messages, max_tokens } = req.body || {};
      if (!Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: 'messages 必须为数组' });
      }
  const serverKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.QINIU_OPENAI_KEY;
  const auth = req.headers['authorization'] || (serverKey ? `Bearer ${serverKey}` : undefined);
      // 设置 SSE 头
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
      });
      res.flushHeaders && res.flushHeaders();

      const upstreamBody = JSON.stringify({
        model: model || 'deepseek-v3',
        messages,
        max_tokens: max_tokens || 1800,
        stream: true
      });

      const options = {
        hostname: 'openai.qiniu.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          'Content-Length': Buffer.byteLength(upstreamBody),
          ...(auth ? { 'Authorization': auth } : {})
        }
      };

      const upstreamReq = https.request(options, (upRes) => {
        upRes.on('data', (chunk) => {
          // 直接转发原始 SSE 块
          res.write(chunk);
        });
        upRes.on('end', () => {
          res.write('data: [DONE]\n\n');
          res.end();
        });
      });
      upstreamReq.on('error', (err) => {
        console.error('上游流式错误:', err.message);
        res.write(`data: {"error":"${err.message}"}\n\n`);
        res.end();
      });
      upstreamReq.write(upstreamBody);
      upstreamReq.end();
    } catch (error) {
      console.error('流式接口异常:', error);
      try {
        res.write(`data: {"error":"${error.message}"}\n\n`);
      } catch (_) {}
      res.end();
    }
  });

  // ========== 复杂任务：子任务拆解与问题分析接口 ==========
  // 子任务拆解（基于 Template 数据+任务名）
  app.post('/api/ai/decompose-subtasks', async (req, res) => {
    try {
      const { taskName, templateData } = req.body || {};
      if (!taskName) return res.status(400).json({ success: false, message: '缺少 taskName' });
  const serverKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.QINIU_OPENAI_KEY;
  const auth = req.headers['authorization'] || (serverKey ? `Bearer ${serverKey}` : undefined);
      const messages = [
        {
          role: 'system',
          content: `你是一个专业的任务拆解专家。根据问题复杂度，将任务拆解成1-5个子任务。\n\n拆解原则：\n- 简单问题：1个子任务（直接可执行）\n- 中等问题：2-3个子任务（需要分步骤）\n- 复杂问题：4-5个子任务（涉及多个领域）\n\n每个子任务包含：name(<=10字)、description(<=50字)、difficulty(easy|medium|hard)。\n\n只返回严格 JSON：{ \\"complexity\\": \\"simple|medium|complex\\", \\"subTasks\\": [{\"name\":\"\",\"description\":\"\",\"difficulty\":\"medium\"}] }`
        },
        {
          role: 'user',
          content: `问题：${taskName}\n\n模板信息：\n解决方案：${templateData?.area || ''}\n目标受众：${templateData?.audience || ''}\n内容：${templateData?.prompt || ''}\n\n请拆解子任务。`
        }
      ];

      const https = require('https');
      const upstreamBody = JSON.stringify({ model: 'deepseek-v3', messages, max_tokens: 1200 });
      const options = {
        hostname: 'openai.qiniu.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(upstreamBody),
          ...(auth ? { 'Authorization': auth } : {})
        }
      };

      const upstreamReq = https.request(options, (upRes) => {
        let raw = '';
        upRes.on('data', chunk => raw += chunk);
        upRes.on('end', () => {
          if (upRes.statusCode && upRes.statusCode >= 400) {
            return res.status(upRes.statusCode).json({ success:false, message:'上游错误', status: upRes.statusCode, body: raw });
          }
          try {
            const parsed = JSON.parse(raw);
            const content = parsed?.choices?.[0]?.message?.content || '{}';
            // 兼容大模型可能带解释文字，截取第一个 JSON 块
            const match = content.match(/\{[\s\S]*\}/);
            const json = JSON.parse(match ? match[0] : content);
            return res.json(json);
          } catch (e) {
            return res.status(502).json({ success:false, message:'解析上游响应失败', raw });
          }
        });
      });
      upstreamReq.on('error', (err) => {
        console.error('decompose-subtasks 上游错误:', err.message);
        res.status(500).json({ success:false, message: err.message });
      });
      upstreamReq.write(upstreamBody);
      upstreamReq.end();
    } catch (error) {
      console.error('调用 /api/ai/decompose-subtasks 失败:', error);
      res.status(500).json({ success:false, message: error.message });
    }
  });

  // 分析所有子任务的潜在问题
  app.post('/api/ai/analyze-task-problems', async (req, res) => {
    try {
      const { taskName, subTasks } = req.body || {};
      if (!taskName || !Array.isArray(subTasks)) {
        return res.status(400).json({ success:false, message: '缺少 taskName 或 subTasks' });
      }
      const list = subTasks.map((t, i) => `${i+1}. ${t.name} - ${t.description || ''}`).join('\n');
  const serverKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.QINIU_OPENAI_KEY;
  const auth = req.headers['authorization'] || (serverKey ? `Bearer ${serverKey}` : undefined);
      const messages = [
        {
          role: 'system',
          content: `你是问题识别专家。分析每个子任务可能遇到的问题，包括：\n- 技术难点\n- 资源限制\n- 风险因素\n- 依赖关系\n- 创新挑战\n\n对每个子任务列出3-5个关键问题。\n严格返回 JSON：{\n  \"problems\": [ { \"subTaskName\": \"\", \"issues\": [\"\",\"\"], \"criticalIssues\": [0] } ]\n}`
        },
        {
          role: 'user',
          content: `主任务：${taskName}\n\n子任务：\n${list}\n\n请分析所有子任务的潜在问题，并仅以JSON返回。`
        }
      ];

      const https = require('https');
      const upstreamBody = JSON.stringify({ model: 'deepseek-v3', messages, max_tokens: 1500 });
      const options = {
        hostname: 'openai.qiniu.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(upstreamBody),
          ...(auth ? { 'Authorization': auth } : {})
        }
      };
      const upstreamReq = https.request(options, (upRes) => {
        let raw = '';
        upRes.on('data', chunk => raw += chunk);
        upRes.on('end', () => {
          if (upRes.statusCode && upRes.statusCode >= 400) {
            return res.status(upRes.statusCode).json({ success:false, message:'上游错误', status: upRes.statusCode, body: raw });
          }
          try {
            const parsed = JSON.parse(raw);
            const content = parsed?.choices?.[0]?.message?.content || '{}';
            const match = content.match(/\{[\s\S]*\}/);
            const json = JSON.parse(match ? match[0] : content);
            return res.json(json);
          } catch (e) {
            return res.status(502).json({ success:false, message:'解析上游响应失败', raw });
          }
        });
      });
      upstreamReq.on('error', (err) => {
        console.error('analyze-task-problems 上游错误:', err.message);
        res.status(500).json({ success:false, message: err.message });
      });
      upstreamReq.write(upstreamBody);
      upstreamReq.end();
    } catch (error) {
      console.error('调用 /api/ai/analyze-task-problems 失败:', error);
      res.status(500).json({ success:false, message: error.message });
    }
  });

  // 批量保存子任务
  app.post('/api/sub-tasks/batch', async (req, res) => {
    try {
      const { taskName, subTasks } = req.body || {};
      if (!taskName || !Array.isArray(subTasks) || subTasks.length === 0) {
        return res.status(400).json({ success:false, message: '缺少 taskName 或 subTasks' });
      }
      // 先清空旧子任务
      await db.promise().execute('DELETE FROM sub_tasks WHERE task_name = ?', [taskName]);
      // 插入新子任务
      for (let i = 0; i < subTasks.length; i++) {
        const t = subTasks[i];
        await db.promise().execute(
          'INSERT INTO sub_tasks (task_name, sub_task_name, description, difficulty, task_order) VALUES (?, ?, ?, ?, ?)',
          [taskName, t.name || '', t.description || '', t.difficulty || 'medium', i + 1]
        );
      }
      // 更新 task_manager_content 摘要
      await db.promise().execute(
        'UPDATE task_manager_content SET sub_tasks_json = ?, sub_tasks_count = ? WHERE task_name = ?',
        [JSON.stringify(subTasks), subTasks.length, taskName]
      );
      res.json({ success:true });
    } catch (error) {
      console.error('批量保存子任务失败:', error);
      res.status(500).json({ success:false, message: error.message });
    }
  });

  // 获取某任务的子任务列表
  app.get('/api/sub-tasks/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      const decoded = decodeURIComponent(taskName);
      const [rows] = await db.promise().execute(
        'SELECT * FROM sub_tasks WHERE task_name = ? ORDER BY task_order',
        [decoded]
      );
      res.json({ success:true, subTasks: rows });
    } catch (error) {
      console.error('获取子任务失败:', error);
      res.status(500).json({ success:false, message: error.message });
    }
  });

  // 批量保存问题清单
  app.post('/api/task-problems/batch', async (req, res) => {
    try {
      const { taskName, problems } = req.body || {};
      if (!taskName || !Array.isArray(problems)) {
        return res.status(400).json({ success:false, message: '缺少 taskName 或 problems' });
      }
      // 获取子任务映射
      const [subs] = await db.promise().execute('SELECT id, sub_task_name FROM sub_tasks WHERE task_name = ?', [taskName]);
      const map = Object.create(null);
      subs.forEach(r => { map[r.sub_task_name] = r.id; });
      // 先清空旧问题
      await db.promise().execute('DELETE FROM task_problems WHERE task_name = ?', [taskName]);
      // 插入
      for (const g of problems) {
        const subId = map[g.subTaskName] || null;
        const issues = Array.isArray(g.issues) ? g.issues : [];
        const criticalIdx = new Set(Array.isArray(g.criticalIssues) ? g.criticalIssues : []);
        for (let i = 0; i < issues.length; i++) {
          const desc = issues[i];
          await db.promise().execute(
            'INSERT INTO task_problems (task_name, sub_task_id, sub_task_name, problem_description, is_critical) VALUES (?, ?, ?, ?, ?)',
            [taskName, subId, g.subTaskName || null, desc, criticalIdx.has(i)]
          );
        }
      }
      res.json({ success:true });
    } catch (error) {
      console.error('批量保存问题失败:', error);
      res.status(500).json({ success:false, message: error.message });
    }
  });

  // 获取问题清单（按子任务分组）
  app.get('/api/task-problems/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      const decoded = decodeURIComponent(taskName);
      const [rows] = await db.promise().execute(
        'SELECT * FROM task_problems WHERE task_name = ? ORDER BY sub_task_id, id',
        [decoded]
      );
      const grouped = {};
      for (const r of rows) {
        const key = r.sub_task_name || '未分组';
        (grouped[key] = grouped[key] || []).push({
          id: r.id,
          description: r.problem_description,
          isCritical: !!r.is_critical,
          isSelected: !!r.is_selected
        });
      }
      res.json({ success:true, problems: grouped });
    } catch (error) {
      console.error('获取问题清单失败:', error);
      res.status(500).json({ success:false, message: error.message });
    }
  });

  // 更新问题选中状态（仅设置传入ID为选中，其余清空；作用域限定在 taskName）
  app.put('/api/task-problems/selection', async (req, res) => {
    try {
      const { selectedIds, taskName } = req.body || {};
      if (!taskName) return res.status(400).json({ success:false, message: '缺少 taskName' });
      const ids = Array.isArray(selectedIds) ? selectedIds : [];
      // 先清空该任务所有 is_selected
      await db.promise().execute('UPDATE task_problems SET is_selected = FALSE WHERE task_name = ?', [taskName]);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        await db.promise().execute(
          `UPDATE task_problems SET is_selected = TRUE WHERE id IN (${placeholders})`,
          ids
        );
      }
      res.json({ success:true });
    } catch (error) {
      console.error('更新问题选中状态失败:', error);
      res.status(500).json({ success:false, message: error.message });
    }
  });

  // ===== TemplateSelection 两方案与AI推荐方法 =====
  // 保存记录（始终插入新记录，按 task_name 可取最新一条）
  app.post('/api/template-selection/save', async (req, res) => {
    try {
      const { taskName, taskIndex, leftContent, rightContent, leftAnalysis, rightAnalysis, leftMethod, rightMethod } = req.body;
      if (!taskName) {
        return res.status(400).json({ success: false, message: '缺少 taskName' });
      }
      const leftA = typeof leftAnalysis === 'string' ? leftAnalysis : JSON.stringify(leftAnalysis || {});
      const rightA = typeof rightAnalysis === 'string' ? rightAnalysis : JSON.stringify(rightAnalysis || {});
      await db.promise().execute(
        `INSERT INTO template_selection_records 
          (task_name, task_index, left_content, right_content, left_analysis, right_analysis, left_method, right_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [taskName, taskIndex ?? null, leftContent || null, rightContent || null, leftA, rightA, leftMethod || null, rightMethod || null]
      );
      res.status(201).json({ success: true, message: '保存成功' });
    } catch (error) {
      console.error('保存TemplateSelection记录失败:', error);
      res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
  });

  // 获取指定任务名的最新记录
  app.get('/api/template-selection/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      const [rows] = await db.promise().execute(
        `SELECT * FROM template_selection_records 
         WHERE task_name = ? ORDER BY created_at DESC LIMIT 1`,
        [decodeURIComponent(taskName)]
      );
      if (!rows || rows.length === 0) {
        return res.json({ success: true, record: null });
      }
      res.json({ success: true, record: rows[0] });
    } catch (error) {
      console.error('获取TemplateSelection记录失败:', error);
      res.status(500).json({ success: false, message: '服务器错误', error: error.message });
    }
  });

  // ===== Visualization 评估相关接口 =====
  
  // 保存Visualization评估数据接口
  app.post('/api/save-visualization-assessment', async (req, res) => {
    try {
      const { 
        taskName, 
        aiScores, 
        accuracyScore, 
        clarityScore, 
        interpretabilityScore, 
        innovationScore,
        assessmentContent,
        radarData,
        userId 
      } = req.body;
      
      if (!taskName || !aiScores) {
        return res.status(400).json({ 
          success: false, 
          message: '任务名称和AI评分不能为空' 
        });
      }
      
      const [result] = await db.promise().execute(
        `INSERT INTO visualization_assessments 
         (task_name, ai_scores, accuracy_score, clarity_score, interpretability_score, 
          innovation_score, assessment_content, radar_data, user_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskName,
          aiScores,
          accuracyScore || 0.00,
          clarityScore || 0.00,
          interpretabilityScore || 0.00,
          innovationScore || 0.00,
          assessmentContent || '',
          JSON.stringify(radarData || [0, 0, 0, 0]),
          userId || null
        ]
      );
      
      console.log('Visualization评估数据保存成功，ID:', result.insertId);
      res.status(201).json({ 
        success: true,
        id: result.insertId,
        message: 'Visualization评估数据保存成功' 
      });
    } catch (error) {
      console.error('保存Visualization评估数据失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 更新Visualization评估数据接口
  app.put('/api/update-visualization-assessment/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        taskName, 
        aiScores, 
        accuracyScore, 
        clarityScore, 
        interpretabilityScore, 
        innovationScore,
        assessmentContent,
        radarData 
      } = req.body;
      
      if (!id || !taskName || !aiScores) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID、任务名称和AI评分不能为空' 
        });
      }
      
      const [result] = await db.promise().execute(
        `UPDATE visualization_assessments 
         SET task_name = ?, ai_scores = ?, accuracy_score = ?, clarity_score = ?, 
             interpretability_score = ?, innovation_score = ?, assessment_content = ?, 
             radar_data = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [
          taskName,
          aiScores,
          accuracyScore || 0.00,
          clarityScore || 0.00,
          interpretabilityScore || 0.00,
          innovationScore || 0.00,
          assessmentContent || '',
          JSON.stringify(radarData || [0, 0, 0, 0]),
          id
        ]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Visualization评估记录不存在' 
        });
      }
      
      console.log('Visualization评估数据更新成功，ID:', id);
      res.json({ 
        success: true,
        message: 'Visualization评估数据更新成功' 
      });
    } catch (error) {
      console.error('更新Visualization评估数据失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 获取所有Visualization评估数据接口
  app.get('/api/visualization-assessments', async (req, res) => {
    try {
      const [assessments] = await db.promise().execute(`
        SELECT va.*, u.username 
        FROM visualization_assessments va
        LEFT JOIN users u ON va.user_id = u.id 
        ORDER BY va.created_at DESC
      `);
      
      // 解析JSON字段，添加错误处理
      const parsedAssessments = assessments.map(assessment => {
        let radarData = [0, 0, 0, 0];
        try {
          if (assessment.radar_data) {
            // 先尝试直接解析
            radarData = JSON.parse(assessment.radar_data);
          }
        } catch (parseError) {
          console.warn('解析radar_data失败，使用默认值:', assessment.radar_data, parseError.message);
          radarData = [0, 0, 0, 0];
        }
        
        return {
          ...assessment,
          radar_data: radarData
        };
      });
      
      res.json({
        success: true,
        assessments: parsedAssessments
      });
    } catch (error) {
      console.error('获取Visualization评估数据失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 根据任务名称获取Visualization评估数据接口
  app.get('/api/visualization-assessments/:taskName', async (req, res) => {
    try {
      const { taskName } = req.params;
      
      const [assessments] = await db.promise().execute(
        `SELECT va.*, u.username 
         FROM visualization_assessments va
         LEFT JOIN users u ON va.user_id = u.id 
         WHERE va.task_name = ? 
         ORDER BY va.created_at DESC`,
        [taskName]
      );
      
      // 解析JSON字段
      const parsedAssessments = assessments.map(assessment => ({
        ...assessment,
        radar_data: JSON.parse(assessment.radar_data || '[0,0,0,0]')
      }));
      
      res.json({
        success: true,
        assessments: parsedAssessments
      });
    } catch (error) {
      console.error('获取任务Visualization评估数据失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 根据ID获取单个Visualization评估数据接口
  app.get('/api/visualization-assessments/id/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const [assessments] = await db.promise().execute(
        `SELECT va.*, u.username 
         FROM visualization_assessments va
         LEFT JOIN users u ON va.user_id = u.id 
         WHERE va.id = ?`,
        [id]
      );
      
      if (assessments.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Visualization评估记录不存在' 
        });
      }
      
      // 解析JSON字段
      const assessment = assessments[0];
      const parsedAssessment = {
        ...assessment,
        radar_data: JSON.parse(assessment.radar_data || '[0,0,0,0]')
      };
      
      res.json({
        success: true,
        assessment: parsedAssessment
      });
    } catch (error) {
      console.error('获取Visualization评估数据失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 根据用户ID获取Visualization评估数据接口
  app.get('/api/visualization-assessments/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const [assessments] = await db.promise().execute(
        `SELECT va.*, u.username 
         FROM visualization_assessments va
         LEFT JOIN users u ON va.user_id = u.id 
         WHERE va.user_id = ? 
         ORDER BY va.created_at DESC`,
        [userId]
      );
      
      // 解析JSON字段
      const parsedAssessments = assessments.map(assessment => ({
        ...assessment,
        radar_data: JSON.parse(assessment.radar_data || '[0,0,0,0]')
      }));
      
      res.json({
        success: true,
        assessments: parsedAssessments
      });
    } catch (error) {
      console.error('获取用户Visualization评估数据失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });

  // 删除Visualization评估数据接口
  app.delete('/api/visualization-assessments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const [result] = await db.promise().execute(
        'DELETE FROM visualization_assessments WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Visualization评估记录不存在' 
        });
      }
      
      console.log('Visualization评估数据删除成功，ID:', id);
      res.json({ 
        success: true,
        message: 'Visualization评估数据删除成功' 
      });
    } catch (error) {
      console.error('删除Visualization评估数据失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});