<template>
  <div class="template-wrapper">
    <!-- 左侧边栏 -->
    <aside class="sidebar">
      <h3>任务记录</h3>
      <div class="task-counter">
        <p>总任务数: <span class="count">{{ totalTaskCount }}</span></p>
      </div>
      <ul class="task-history">
        <li 
          v-for="(task, index) in recentTasks" 
          :key="index" 
          class="task-item"
        >
          <span class="task-name">{{ task }}</span>
        </li>
      </ul>
    </aside>
    
    <!-- 主要内容区域 -->
    <main class="main-content">
      <div class="template-container">
        <div class="header">
          <h1>目标提示</h1>
          <p>Target cue</p>
        </div>
        <form @submit.prevent="handleSubmit" class="form-container" v-loading="isLoading" v-bind="loadingProps">
      
      <div class="form-group">
        <label for="area"><strong>解决方案</strong></label>
        <textarea id="area" v-model="form.area" required class="input-field area-textarea"></textarea>
      </div>
      <div class="form-group">
        <label for="audience"><strong>目标受众</strong></label>
        <textarea id="audience" v-model="form.audience" required class="input-field area-textarea"></textarea>
      </div>
      <div class="form-group">
        <label for="keywords"><strong>指令</strong></label>
        <div class="keywords-container">
          <div v-if="commandWords.length > 0" class="checkbox-words">
            <label v-for="(word, index) in commandWords" :key="index" class="word-checkbox">
              <input 
                type="checkbox" 
                v-model="selectedCommandWords" 
                :value="word"
                @change="updateCommandText"
              />
              <span>{{ word }}</span>
            </label>
          </div>
          <textarea 
            id="keywords" 
            v-model="form.keywords" 
            required 
            class="input-field area-textarea"
            @input="parseCommandWords"
          ></textarea>
        </div>
      </div>
      <div class="form-group">
        <label for="tone"><strong>语气</strong></label>
        <div class="keywords-container">
          <div v-if="keyWords.length > 0" class="checkbox-words">
            <label v-for="(word, index) in keyWords" :key="index" class="word-checkbox">
              <input 
                type="checkbox" 
                v-model="selectedKeyWords" 
                :value="word"
                @change="updateKeyText"
              />
              <span>{{ word }}</span>
            </label>
          </div>
          <textarea 
            id="tone" 
            v-model="form.tone" 
            required 
            class="input-field area-textarea"
            @input="parseKeyWords"
          ></textarea>
        </div>
      </div>
      <div class="form-group">
        <label for="prompt"><strong>内容</strong></label>
        <textarea id="prompt" v-model="form.prompt" required class="input-field area-textarea"></textarea>
      </div>
      <div class="button-row">
        <button type="button" class="refine-button left-btn" @click="rethink" :disabled="isLoading">
          {{ buttonTexts.rethink }}
        </button>
        <button type="submit" class="refine-button right-btn" :disabled="isLoading">
          {{ buttonTexts.submit }}
        </button>
      </div>
    </form>
      </div>
    </main>
  </div>
</template>

<script>
import { useLoading, defaultLoadingConfig, getLoadingProps } from '@/utils'

// 常量定义
const API_CONFIG = {
  AI_URL: '/api/ai',  // AI相关请求
  MODEL: 'deepseek-v3',
  MAX_TOKENS: {
    RETHINK: 3000,
    SUBMIT: 1500
  }
};

// 数据库API配置
const DB_CONFIG = {
  SAVE_URL: '/api/save-content',
  UPDATE_URL: '/api/update-content'
};

const WORD_SEPARATORS = /[,，;；\s、\n]+/;

export default {
  name: 'Template',
  setup() {
    // 使用Loading工具
    const {
      isRethinking,
      isSubmitting,
      isLoading,
      startRethinking,
      stopRethinking,
      startSubmitting,
      stopSubmitting,
      getButtonText
    } = useLoading()

    // 获取Loading配置属性
    const loadingProps = getLoadingProps(defaultLoadingConfig)

    return {
      isRethinking,
      isSubmitting,
      isLoading,
      startRethinking,
      stopRethinking,
      startSubmitting,
      stopSubmitting,
      getButtonText,
      loadingProps
    }
  },
  data() {
    return {
      form: {
        area: '',
        audience: '',
        keywords: '',
        tone: '',
        prompt: ''
      },
      commandWords: [],
      keyWords: [],
      selectedCommandWords: [],
      selectedKeyWords: [],
      contentId: null, // 用于存储数据库中记录的ID
      totalTaskCount: 0, // Dialog.vue中的总任务数
      recentTasks: [], // 最近的任务列表
      user: null // 当前用户信息
    };
  },
  computed: {
    // 计算属性：按钮文字
    buttonTexts() {
      return {
        rethink: this.getButtonText('思考', '正在生成...', this.isRethinking),
        submit: this.getButtonText('下一步', '正在处理...', this.isSubmitting)
      };
    }
  },
  async created() {
    // 获取用户信息
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!this.user.id) {
      console.warn('用户未登录');
      // 可以选择跳转到登录页面或使用默认逻辑
    }
    
    const templateName = this.$route.query.templateName;
    if (templateName) {
      this.form.area = templateName;
    }
  // 加载Dialog.vue的任务数据（从数据库）
  await this.loadDialogTasks();
  // 刷新后从数据库恢复最近一次内容
  await this.loadExistingContent();
  // 不再自动AI思考；改为用户点击“重新思考”按钮后再触发
  },
  methods: {
    // 限制：指令（keywords）最多6个，目标受众（audience）最多2个
    getLimitedKeywords() {
      const words = this.parseWords(this.form.keywords).slice(0,6);
      return words.join('、');
    },
    getLimitedAudience() {
      if(!this.form.audience) return '';
      // 以换行 / 分隔符 / 逗号切分，取前2项
      const parts = this.form.audience
        .split(/[,，;；\n]/)
        .map(s=>s.trim())
        .filter(Boolean)
        .slice(0,2);
      return parts.join('，');
    },
    // 刷新恢复：按当前任务读取最近一次保存的表单内容
    async loadExistingContent() {
      try {
        const currentTaskName = this.getCurrentTaskName();
        if (!currentTaskName) return;
        const resp = await fetch(`/api/ai-content/${encodeURIComponent(currentTaskName)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const list = Array.isArray(data.aiContents) ? data.aiContents : [];
        if (list.length === 0) return;
        // 已按时间倒序返回，取第一条
        const latest = list[0];
        this.form.area = this.form.area || latest.area || '';
        this.form.audience = latest.audience || '';
        this.form.keywords = latest.keywords || '';
        this.form.tone = latest.tone || '';
        this.form.prompt = latest.prompt || '';
        this.contentId = latest.id || null;
        // 同步复选词
        this.parseCommandWords();
        this.parseKeyWords();
      } catch (e) {
        console.warn('恢复已保存内容失败:', e.message);
      }
    },
    // 生成任务规划：主演化（趋势分析）+ 主系统（九宫格+因果分析）+ 主作用（FOP分析）
    async generateTaskPlan() {
      try {
        const instruction = [
          '你是一名中文研发方法论助手，请基于用户给定的目标与上下文，生成“任务规划”三部分：',
          '1) 主演化（趋势分析）：围绕主题的趋势与演进，给出3-6条分点，强调技术/需求/环境的变化；',
          '2) 主系统（九宫格 + 因果分析）：先做九宫格（目标/约束/资源/对象/过程/环境/时间/空间/风险），每格1-3点；再做简洁因果链（3-6条），用于解释关键因果；',
          '3) 主作用（FOP 分析）：围绕Function-Object-Process进行作用场景分析，给出3-6条，格式为“功能-对象-过程：要点”；',
          '输出要求：',
          '- 返回 JSON，结构如下：',
          '{"tasks":[{"id":"trend","name":"主演化（趋势分析）","content":"markdown内容"},{"id":"system","name":"主系统（九宫格+因果分析）","content":"markdown内容"},{"id":"fop","name":"主作用（FOP分析）","content":"markdown内容"}]}',
          '- content 使用 Markdown，包含清晰的小标题与分点；',
          '- 如信息不足，可作合理（假设）并标注；',
          '严格要求：必须包含且仅包含3个 tasks，id 必须分别为 trend / system / fop，若某部分信息不足也要给出结构化占位，不得缺失或改名。'
        ].join('\n');

        const limitedAudience = this.getLimitedAudience();
        const limitedKeywords = this.getLimitedKeywords();
        const userContext = [
          `指令: ${this.form.area}`,
          `上下文(受众<=2已截断): ${limitedAudience}`,
          `受众指令(<=6已截断): ${limitedKeywords}`,
          `语调: ${this.form.tone}`,
          `任务改写: ${this.form.prompt}`
        ].join('\n');

        const resp = await fetch(API_CONFIG.AI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`
          },
          body: JSON.stringify({
            model: API_CONFIG.MODEL,
            messages: [
              { role: 'system', content: instruction },
              { role: 'user', content: userContext }
            ],
            max_tokens: 2500
          })
        });

        if (!resp.ok) {
          let errText = '';
          try { errText = await resp.text(); } catch (_) {}
          console.warn('生成任务规划失败，状态码:', resp.status, '响应:', errText?.slice(0, 500));
          return null;
        }

        const data = await resp.json();
        let content = data.choices?.[0]?.message?.content?.trim();
        if (!content) return null;

        let plan = null;
        try {
          plan = JSON.parse(content);
        } catch (_) {
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            try { plan = JSON.parse(match[0]); } catch (_) {}
          }
        }

        if (plan && Array.isArray(plan.tasks)) {
          // 补全 / 纠正 3 个固定任务结构
          const requiredOrder = ['trend','system','fop'];
          const requiredMeta = {
            trend: '主演化（趋势分析）',
            system: '主系统（九宫格+因果分析）',
            fop: '主作用（FOP分析）'
          };
          const byId = new Map();
            plan.tasks.forEach(t=>{ if(t&&t.id) byId.set(String(t.id), t); });
          requiredOrder.forEach(id=>{
            if(!byId.has(id)) {
              byId.set(id, { id, name: requiredMeta[id], content: '（该部分原始生成缺失，已占位，请稍后补充）' });
            } else {
              const obj = byId.get(id);
              if(!obj.name) obj.name = requiredMeta[id];
              if(typeof obj.content !== 'string') obj.content = String(obj.content || '');
            }
          });
          // 以固定顺序重建
          plan.tasks = requiredOrder.map(id=>byId.get(id));
          sessionStorage.setItem('taskPlan', JSON.stringify(plan));
          // 持久化到后端（不创建新表，复用 task_manager_content）
          try {
            const currentTaskName = this.getCurrentTaskName();
            await fetch('/api/task-plan/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskName: currentTaskName, planTasks: plan.tasks })
            });
          } catch (e) {
            console.warn('任务规划持久化失败（将继续使用会话缓存）:', e.message);
          }
          return plan;
        }
        return null;
      } catch (e) {
        console.error('任务规划生成异常:', e);
        return null;
      }
    },
    async rethink() {
  console.log('思考');
      this.startRethinking();
      try {
        const response = await fetch(API_CONFIG.AI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-v3',
            messages: [
              { role: 'user', content: `请根据以下原文用中文智能生成“Memory、上下文、关键词、任务改写”四项内容，返回格式为JSON：{"audience":"...","keywords":"...","tone":"...","prompt":"..."}。原文：${this.form.area}` }
            ],
            max_tokens: 300
          })
        });
        if (response.status === 200) {
          const data = await response.json();
          let content = data.choices[0].message.content;
          // 尝试解析JSON
          try {
            const aiResult = JSON.parse(content);
            this.form.audience = aiResult.audience || '';
            this.form.keywords = aiResult.keywords || '';
            this.form.tone = aiResult.tone || '';
            this.form.prompt = aiResult.prompt || '';
            // 解析Command和Key词语
            this.parseCommandWords();
            this.parseKeyWords();
            
            // 保存或更新到数据库
            await this.saveOrUpdateContent();
          } catch (e) {
            // 若AI返回不是标准JSON，做简单提取
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const aiResult = JSON.parse(match[0]);
                this.form.audience = aiResult.audience || '';
                this.form.keywords = aiResult.keywords || '';
                this.form.tone = aiResult.tone || '';
                this.form.prompt = aiResult.prompt || '';
                // 解析Command和Key词语
                this.parseCommandWords();
                this.parseKeyWords();
                
                // 保存或更新到数据库
                await this.saveOrUpdateContent();
              } catch (e2) {}
            }
          }
        }
      } catch (error) {
        // 忽略AI生成失败，用户可手动填写
      } finally {
        this.stopRethinking();
      }
    },
    /**
     * 处理表单提交
     */
    async handleSubmit() {
      if (this.isLoading) return;
      
      this.startSubmitting();

      try {
        const limitedAudience = this.getLimitedAudience();
        const limitedKeywords = this.getLimitedKeywords();
        const messages = [
          { role: 'user', content: `指令: ${this.form.area}` },
          { role: 'user', content: `上下文(受众<=2已截断): ${limitedAudience}` },
          { role: 'user', content: `受众指令(<=6已截断): ${limitedKeywords}` },
          { role: 'user', content: `语调: ${this.form.tone}` },
          { role: 'user', content: `任务改写: ${this.form.prompt}` }
        ];
        
  const response = await fetch(API_CONFIG.AI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`
          },
          body: JSON.stringify({
            model: API_CONFIG.MODEL,
            messages: messages,
            max_tokens: API_CONFIG.MAX_TOKENS.SUBMIT
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.choices?.[0]?.message?.content?.trim();
          
          if (aiResponse) {
            // 存储AI回复到sessionStorage
            sessionStorage.setItem('aiResponse', aiResponse);

            // 额外：生成任务规划（三个子任务）并缓存
            await this.generateTaskPlan();
            
            // 获取当前任务名称
            const currentTaskName = this.getCurrentTaskName();
            
            // 跳转到下一个页面，传递表单数据和当前任务名称
            this.$router.push({ 
              name: 'TaskManager', 
              query: { 
                ...this.form,
                currentTask: currentTaskName  // 传递当前任务名称
              } 
            });
          } else {
            console.error('AI响应内容为空');
          }
        } else {
          let errBody = '';
          try { errBody = await response.text(); } catch (_) {}
          console.error('AI响应错误，状态码:', response.status, '响应:', errBody?.slice(0, 500));
        }
      } catch (error) {
        console.error('请求失败:', error);
      } finally {
        this.stopSubmitting();
      }
    },
    
    /**
     * 通用词语解析方法
     */
    parseWords(text) {
      if (!text) return [];
      
      return text
        .split(WORD_SEPARATORS)
        .map(word => word.trim())
        .filter(word => word.length > 0);
    },

    /**
     * 解析Command词语
     */
    parseCommandWords() {
      const words = this.parseWords(this.form.keywords);
      this.commandWords = words;
      this.selectedCommandWords = [...words];
    },
    
    /**
     * 解析Key词语
     */
    parseKeyWords() {
      const words = this.parseWords(this.form.tone);
      this.keyWords = words;
      this.selectedKeyWords = [...words];
    },
    
    /**
     * 更新Command文本框内容
     */
    updateCommandText() {
      this.form.keywords = this.selectedCommandWords.join('、');
    },
    
    /**
     * 更新Key文本框内容
     */
    updateKeyText() {
      this.form.tone = this.selectedKeyWords.join('、');
    },
    
    /**
     * 保存或更新内容到数据库
     */
    async saveOrUpdateContent() {
      try {
        // 获取当前任务名称
        const currentTaskName = this.getCurrentTaskName();
        
        const contentData = {
          area: this.form.area,
          audience: this.form.audience,
          keywords: this.form.keywords,
          tone: this.form.tone,
          prompt: this.form.prompt,
          taskName: currentTaskName,
          timestamp: new Date().toISOString()
        };

        if (this.contentId) {
          // 更新现有记录
          const response = await fetch(DB_CONFIG.UPDATE_URL, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: this.contentId,
              ...contentData
            })
          });

          if (response.ok) {
            console.log('内容已更新到数据库');
          } else {
            console.error('更新数据库失败:', response.status);
          }
        } else {
          // 创建新记录
          const response = await fetch(DB_CONFIG.SAVE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(contentData)
          });

          if (response.ok) {
            const result = await response.json();
            this.contentId = result.id; // 保存返回的ID
            console.log('内容已保存到数据库，ID:', this.contentId);
          } else {
            console.error('保存到数据库失败:', response.status);
          }
        }
      } catch (error) {
        console.error('数据库操作失败:', error);
      }
    },
    
    /**
     * 获取当前任务名称
     */
    getCurrentTaskName() {
      // 优先从Dialog.vue的localStorage中获取当前选中的任务
      try {
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        const currentTask = localStorage.getItem('currentDialogTask');
        
        // 如果有明确的当前任务设置，优先使用
        if (currentTask && dialogTasks.includes(currentTask)) {
          console.log('Template获取当前任务名称:', currentTask);
          return currentTask;
        }
        
        // 如果没有明确的当前任务，但有任务列表，使用最新的任务
        if (dialogTasks.length > 0) {
          const latestTask = dialogTasks[dialogTasks.length - 1];
          console.log('Template使用localStorage中的最新任务作为当前任务:', latestTask);
          return latestTask;
        }
        
        // 备用方案：尝试从数据库任务列表中获取最新任务（注意：数据库任务列表是按创建时间降序排序的）
        if (this.recentTasks.length > 0) {
          // this.recentTasks[0] 是最新创建的任务，不是任务1
          const latestTaskFromDB = this.recentTasks[0];
          console.log('Template使用数据库中的最新任务作为当前任务:', latestTaskFromDB);
          return latestTaskFromDB;
        }
        
        // 如果没有任务，创建一个默认任务名
        return 'Template任务';
      } catch (error) {
        console.error('获取任务名称失败:', error);
        return 'Template任务';
      }
    },
    
    /**
     * 从数据库加载Dialog.vue的任务数据
     */
    async loadDialogTasks() {
      try {
        // 如果用户已登录，从数据库获取任务
        if (this.user && this.user.id) {
          const response = await fetch(`/api/dialog-tasks/${this.user.id}`);
          if (response.ok) {
            const data = await response.json();
            const tasks = data.tasks || [];
            
            // 提取任务名称，按创建时间降序排序
            const taskNames = tasks
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map(task => task.task_name);
            
            this.totalTaskCount = taskNames.length;
            this.recentTasks = taskNames; // 显示所有任务，不限制数量
            
            console.log('从数据库加载的任务列表:', taskNames);
            return;
          } else {
            console.warn('从数据库获取任务失败，使用localStorage备用方案');
          }
        }
        
        // 备用方案：从localStorage获取Dialog.vue保存的任务数据
        this.loadDialogTasksFromLocalStorage();
      } catch (error) {
        console.error('从数据库加载任务数据失败:', error);
        // 备用方案：从localStorage获取Dialog.vue保存的任务数据
        this.loadDialogTasksFromLocalStorage();
      }
    },
    
    /**
     * 从localStorage加载Dialog.vue的任务数据（备用方案）
     */
    loadDialogTasksFromLocalStorage() {
      try {
        // 从localStorage获取Dialog.vue保存的任务数据
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        this.totalTaskCount = dialogTasks.length;
        // 显示所有任务，按最新顺序
        this.recentTasks = dialogTasks.slice().reverse();
        
        console.log('从localStorage加载的任务列表:', this.recentTasks);
      } catch (error) {
        console.error('从localStorage加载任务数据失败:', error);
        this.totalTaskCount = 0;
        this.recentTasks = [];
      }
    }
  }
};
</script>

<style scoped>
:root {
  /* 颜色变量 */
  --primary-color: #3b3b6d;
  --secondary-color: #5a5a89;
  --accent-color: #007bff;
  --background-gradient: linear-gradient(135deg, #e0e7ff 0%, #f9f9f9 100%);
  --sidebar-gradient: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
  --success-gradient: linear-gradient(90deg, #28a745 0%, #5be584 100%);
  --warning-gradient: linear-gradient(90deg, #ffc107 0%, #ffe082 100%);
  
  /* 边距和尺寸变量 */
  --border-radius: 6px;
  --border-radius-large: 14px;
  --border-radius-xlarge: 18px;
  --shadow-light: 0 2px 12px rgba(60, 60, 120, 0.06);
  --shadow-medium: 0 4px 20px rgba(60, 60, 120, 0.15);
  --shadow-heavy: 0 6px 32px rgba(60, 60, 120, 0.10);
  
  /* 过渡变量 */
  --transition-fast: 0.2s;
  --transition-medium: 0.3s;
}

.template-wrapper {
  display: flex;
  min-height: 100vh;
  background: var(--background-gradient);
}

/* 左侧边栏样式 */
.sidebar {
  width: 250px;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 20px;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.sidebar h3 {
  margin: 0 0 20px 0;
  font-size: 1.3em;
  text-align: center;
  color: #ecf0f1;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 12px;
  font-weight: 600;
}

.task-counter {
  background: rgba(255, 255, 255, 0.15);
  padding: 18px;
  border-radius: 10px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.task-counter p {
  margin: 0;
  font-size: 1.1em;
  color: #ecf0f1;
  font-weight: 500;
}

.count {
  font-weight: bold;
  font-size: 1.4em;
  color: #f39c12;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.task-history {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.task-item {
  padding: 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  border-left: 4px solid #3498db;
  transition: all var(--transition-fast);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.task-item:hover {
  background: rgba(255, 255, 255, 0.25);
  border-left-color: #e74c3c;
  transform: translateX(2px);
}

.task-name {
  font-size: 0.95em;
  display: block;
  word-wrap: break-word;
  line-height: 1.4;
  color: #ecf0f1;
  font-weight: 500;
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  padding: 40px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.template-container {
  width: 90%;
  max-width: 820px;
  margin: 0 auto;
  padding: 36px 24px 32px 24px;
  background: var(--background-gradient);
  border-radius: var(--border-radius-xlarge);
  box-shadow: var(--shadow-heavy);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  margin: 0 0 8px 0;
  font-size: 2.3em;
  color: var(--primary-color);
  letter-spacing: 2px;
  font-weight: 700;
}

.header p {
  margin: 0;
  font-size: 1.15em;
  color: var(--secondary-color);
  letter-spacing: 1px;
}

.form-container {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: var(--border-radius-large);
  box-shadow: var(--shadow-light);
  padding: 32px 28px 24px 28px;
  position: relative;
  min-height: 400px; /* 确保有足够的高度显示Loading */
}

/* 确保Element Plus Loading遮罩正确显示 */
.form-container :deep(.el-loading-mask) {
  border-radius: var(--border-radius-large);
}

.form-group {
  margin-bottom: 22px;
}

label {
  display: block;
  margin-bottom: 7px;
  font-size: 1.13em;
  color: #2d3a4b;
  font-weight: 600;
  letter-spacing: 1px;
}

.input-field {
  width: 100%;
  padding: 12px;
  font-size: 1.08em;
  border: 1.5px solid #bfcfff;
  border-radius: var(--border-radius);
  box-sizing: border-box;
  background: #f7fafd;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  color: #333;
  font-family: inherit;
}

.input-field:focus {
  border-color: var(--accent-color);
  outline: none;
  box-shadow: 0 0 0 2px #e0e7ff;
}

.area-textarea {
  min-height: 70px;
  resize: vertical;
  font-family: inherit;
}

.button-row {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-top: 18px;
}

.refine-button {
  flex: 1;
  padding: 12px 0;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1.15em;
  font-weight: 600;
  transition: background var(--transition-medium), box-shadow var(--transition-medium);
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
}

.left-btn {
  background: #ffc107;
  color: #333;
}

.left-btn:hover:not(:disabled) {
  background: #e0a800;
}

.right-btn {
  background: #28a745;
  color: #fff;
}

.right-btn:hover:not(:disabled) {
  background: #218838;
}

.refine-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #ccc !important;
}

/* 词语选择样式 */
.keywords-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-words {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: var(--border-radius);
  max-height: 120px;
  overflow-y: auto;
}

.word-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 0.9em;
  white-space: nowrap;
}

.word-checkbox:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.word-checkbox input[type="checkbox"] {
  margin: 0;
  transform: scale(0.9);
}

.word-checkbox input[type="checkbox"]:checked + span {
  color: var(--accent-color);
  font-weight: 600;
}

.word-checkbox span {
  color: #495057;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .template-wrapper {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    padding: 15px;
    order: -1;
  }
  
  .main-content {
    padding: 20px;
  }
  
  .template-container {
    width: 100%;
    padding: 20px;
  }
}
</style>