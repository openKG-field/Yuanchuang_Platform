<template>
  <div class="template-selection">
    <nav class="navbar">
      <div class="logo">模板选择</div>
    </nav>

    <div class="page-body">
      <!-- 左侧边栏：与 Results 风格统一，可收起，仅显示任务序号与名称 -->
      <aside :class="['sidebar-left', { collapsed: sidebarCollapsed }]">
        <div class="toggle-icon" @click="toggleSidebar">
          <el-icon>
            <component :is="sidebarCollapsed ? 'el-icon-arrow-right' : 'el-icon-arrow-left'" />
          </el-icon>
        </div>
        <template v-if="!sidebarCollapsed">
          <h3>当前任务</h3>
          <div class="task-no">第 <span class="no">{{ displayedTaskNumber }}</span> 个</div>
          <div class="task-name" :title="currentTaskName">{{ currentTaskName }}</div>
        </template>
        <template v-else>
          <div class="mini">第{{ displayedTaskNumber }}个</div>
        </template>
      </aside>

      <!-- 主内容区 -->
      <main class="content">
        <!-- 任务记录顶栏 -->
        <div class="task-record-bar">
          <span>任务记录：{{ currentTaskName }}</span>
        </div>

        <div class="editor-window">
          <h2>编辑结果</h2>
          <div class="editor-content">
            <div class="editor-half">
              <h3>
                <input type="radio" value="left" v-model="selectedTitle" /> 标题1
              </h3>
              <input type="text" v-model="titleInput" placeholder="提升温度" />
              <h3>具体内容</h3>
              <textarea v-model="contentInputLeft" placeholder="1" rows="5"></textarea>
            </div>
            <div class="editor-half">
              <h3>
                <input type="radio" value="right" v-model="selectedTitle" /> 标题2
              </h3>
              <input type="text" v-model="titleInput" placeholder="提升温度" />
              <h3>具体内容</h3>
              <textarea v-model="contentInputRight" placeholder="2" rows="5"></textarea>
            </div>
          </div>
        </div>

        <!-- AI 创新方法推荐与结构化分析 -->
        <div class="ai-section">
          <h2>AI 推荐创新方法</h2>
          <div v-if="aiLoading" class="ai-loading">AI 正在分析两个方案…</div>
          <div v-else class="ai-grid">
            <div class="ai-card">
              <h3>方案一推荐</h3>
              <div v-if="leftError" class="ai-error">{{ leftError }}</div>
              <template v-else>
                <div class="kv"><span class="k">矛盾参数：</span><span class="v">{{ (leftAnalysis?.contradict_parameters || []).join('、') || '—' }}</span></div>
                <div class="kv"><span class="k">关键参数：</span><span class="v">{{ (leftAnalysis?.key_parameters || []).join('、') || '—' }}</span></div>
                <div class="kv"><span class="k">场变化：</span><span class="v">{{ (leftAnalysis?.field_changes || []).join('、') || '—' }}</span></div>
                <div class="kv"><span class="k">FOP 组合：</span><span class="v">{{ (leftAnalysis?.FOP_combinations || []).join('；') || '—' }}</span></div>
                <div class="method">
                  <div class="method-title">推荐方法：</div>
                  <pre class="method-content">{{ leftAnalysis?.innovative_method || leftMethod || '—' }}</pre>
                </div>
              </template>
            </div>
            <div class="ai-card">
              <h3>方案二推荐</h3>
              <div v-if="rightError" class="ai-error">{{ rightError }}</div>
              <template v-else>
                <div class="kv"><span class="k">矛盾参数：</span><span class="v">{{ (rightAnalysis?.contradict_parameters || []).join('、') || '—' }}</span></div>
                <div class="kv"><span class="k">关键参数：</span><span class="v">{{ (rightAnalysis?.key_parameters || []).join('、') || '—' }}</span></div>
                <div class="kv"><span class="k">场变化：</span><span class="v">{{ (rightAnalysis?.field_changes || []).join('、') || '—' }}</span></div>
                <div class="kv"><span class="k">FOP 组合：</span><span class="v">{{ (rightAnalysis?.FOP_combinations || []).join('；') || '—' }}</span></div>
                <div class="method">
                  <div class="method-title">推荐方法：</div>
                  <pre class="method-content">{{ rightAnalysis?.innovative_method || rightMethod || '—' }}</pre>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="next-button">
          <button @click="goToFinalResult">下一步</button>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import { ElIcon } from 'element-plus';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
export default {
  name: "TemplateSelection",
  data() {
    return {
      titleInput: '问题技术方案',
      contentInputLeft: '',
      contentInputRight: '',
      selectedTitle: '', // 新增，记录选中的标题
      currentTaskName: '', // 当前任务名称
      // 侧边栏和任务序号
      sidebarCollapsed: false,
      taskIndex: -1,
      // AI 分析状态
      aiLoading: false,
      leftAnalysis: null,
      rightAnalysis: null,
      leftMethod: '',
      rightMethod: '',
      leftError: '',
      rightError: ''
    };
  },
  components: {
    ElIcon,
    'el-icon-arrow-left': ArrowLeft,
    'el-icon-arrow-right': ArrowRight
  },
  computed: {
    displayedTaskNumber() {
      return this.taskIndex >= 0 ? this.taskIndex + 1 : '-';
    }
  },
  created() {
    // 优先从 localStorage 载入上一页保存的大文本，避免长 URL
    const from = this.$route.query.from;
    if (from === 'results') {
      // 改为直接从后端 results_solutions 根据 taskName / analysisId 读取
      this.loadSolutionsFromBackend();
    } else {
      this.contentInputLeft = this.$route.query.contentInputLeft || '';
      this.contentInputRight = this.$route.query.contentInputRight || '';
    }
    
    // 获取当前任务名称
    this.getCurrentTaskName();
  // 优先从后端读取已存在的AI推荐；没有再自动分析
  this.bootstrapFromBackendOrAnalyze();
  },
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
    /**
     * 获取当前任务名称
     */
    getCurrentTaskName() {
      try {
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        const currentTask = localStorage.getItem('currentDialogTask');
        
        if (currentTask && dialogTasks.includes(currentTask)) {
          this.currentTaskName = currentTask;
          this.taskIndex = dialogTasks.indexOf(currentTask);
        } else if (dialogTasks.length > 0) {
          this.currentTaskName = dialogTasks[dialogTasks.length - 1];
          this.taskIndex = dialogTasks.length - 1;
        } else {
          this.currentTaskName = 'TemplateSelection任务';
          this.taskIndex = -1;
        }
      } catch (error) {
        console.error('获取任务名称失败:', error);
        this.currentTaskName = 'TemplateSelection任务';
        this.taskIndex = -1;
      }
    },
    async bootstrapFromBackendOrAnalyze() {
      try {
        // 先查库（如果有任务名）
        if (this.currentTaskName) {
          const res = await fetch(`/api/template-selection/${encodeURIComponent(this.currentTaskName)}`);
          if (res.ok) {
            const data = await res.json();
            const rec = data?.record;
            if (rec && (rec.left_method || rec.right_method)) {
              // 命中缓存，直接渲染
              this.taskIndex = Number.isInteger(rec.task_index) ? rec.task_index : this.taskIndex;
              try { this.leftAnalysis = JSON.parse(rec.left_analysis || '{}'); } catch (_) { this.leftAnalysis = null; }
              try { this.rightAnalysis = JSON.parse(rec.right_analysis || '{}'); } catch (_) { this.rightAnalysis = null; }
              this.leftMethod = rec.left_method || '';
              this.rightMethod = rec.right_method || '';
              // 若后端存了左右原文，可覆盖
              if (!this.contentInputLeft && rec.left_content) this.contentInputLeft = rec.left_content;
              if (!this.contentInputRight && rec.right_content) this.contentInputRight = rec.right_content;
              return; // 不再自动思考
            }
          }
        }
      } catch (e) {
        console.warn('查询模板选择记录失败，回退到自动分析:', e?.message);
      }
      // 未命中则自动分析并保存
      await this.generateInnovations(true);
    },
    async generateInnovations(shouldPersist = false) {
      try {
        this.aiLoading = true;
        this.leftError = '';
        this.rightError = '';
        const [left, right] = await Promise.all([
          this.analyzeSolution(this.contentInputLeft, '方案一'),
          this.analyzeSolution(this.contentInputRight, '方案二')
        ]);
        this.leftAnalysis = left?.analysis || null;
        this.leftMethod = left?.analysis?.innovative_method || '';
        this.rightAnalysis = right?.analysis || null;
        this.rightMethod = right?.analysis?.innovative_method || '';
        if (!left?.ok) this.leftError = left?.error || 'AI 分析失败';
        if (!right?.ok) this.rightError = right?.error || 'AI 分析失败';
        // 入库
        if (shouldPersist && this.currentTaskName) {
          try {
            await fetch('/api/template-selection/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskName: this.currentTaskName,
                taskIndex: this.taskIndex,
                leftContent: this.contentInputLeft,
                rightContent: this.contentInputRight,
                leftAnalysis: this.leftAnalysis,
                rightAnalysis: this.rightAnalysis,
                leftMethod: this.leftMethod,
                rightMethod: this.rightMethod
              })
            });
          } catch (e) {
            console.warn('保存模板选择记录失败:', e?.message);
          }
        }
      } catch (e) {
        this.leftError = this.leftError || 'AI 分析异常';
        this.rightError = this.rightError || 'AI 分析异常';
      } finally {
        this.aiLoading = false;
      }
    },
    async analyzeSolution(solutionText, label) {
      try {
        if (!solutionText || !String(solutionText).trim()) {
          return { ok: false, error: `${label} 内容为空` };
        }
        const instruction = [
          '你是一名创新设计方法（TRIZ/ARIZ）与FOP分析专家。请基于给定方案文本，提炼结构化要素并推荐一个创新方法。',
          '输出严格为 JSON，键名与类型如下：',
          '{"contradict_parameters": ["..."], "key_parameters": ["..."], "field_changes": ["..."], "FOP_combinations": ["Function-Object-Process"], "innovative_method": "用中文描述推荐方法，包含理由与关键步骤，最多300字"}',
          '约束：不要输出除 JSON 以外的任何文字；如信息不足请合理假设并标注（假设）。'
        ].join('\n');
        const user = `方案文本：\n${solutionText}`;
        const resp = await fetch('/api/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-v3',
            messages: [
              { role: 'system', content: instruction },
              { role: 'user', content: user }
            ],
            max_tokens: 800
          })
        });
        if (!resp.ok) {
          let t = '';
          try { t = await resp.text(); } catch (_) {}
          return { ok: false, error: `HTTP ${resp.status}: ${t?.slice(0, 200)}` };
        }
        const data = await resp.json();
        let content = data?.choices?.[0]?.message?.content || '';
        let json = null;
        try {
          json = JSON.parse(content);
        } catch (_) {
          const m = content.match(/\{[\s\S]*\}/);
          if (m) {
            try { json = JSON.parse(m[0]); } catch (_) {}
          }
        }
        if (!json || typeof json !== 'object') {
          return { ok: false, error: '返回非JSON或解析失败' };
        }
        // 归一化字段
        const analysis = {
          contradict_parameters: Array.isArray(json.contradict_parameters) ? json.contradict_parameters : [],
          key_parameters: Array.isArray(json.key_parameters) ? json.key_parameters : [],
          field_changes: Array.isArray(json.field_changes) ? json.field_changes : [],
          FOP_combinations: Array.isArray(json.FOP_combinations) ? json.FOP_combinations : [],
          innovative_method: typeof json.innovative_method === 'string' ? json.innovative_method : ''
        };
        return { ok: true, analysis };
      } catch (e) {
        return { ok: false, error: e?.message || '异常' };
      }
    },
    goToFinalResult() {
      let finalResult = '';
      let baseContent = '';
      let methodContent = '';
      let chosenSide = '';
      if (this.selectedTitle === 'left') {
        finalResult = this.leftAnalysis?.innovative_method || this.leftMethod || this.contentInputLeft;
        methodContent = this.leftAnalysis?.innovative_method || this.leftMethod || '';
        baseContent = this.contentInputLeft;
        chosenSide = 'left';
      } else if (this.selectedTitle === 'right') {
        finalResult = this.rightAnalysis?.innovative_method || this.rightMethod || this.contentInputRight;
        methodContent = this.rightAnalysis?.innovative_method || this.rightMethod || '';
        baseContent = this.contentInputRight;
        chosenSide = 'right';
      } else {
        alert('请先选择一个方案 (标题1 或 标题2)');
        return;
      }
      // 为避免 URL 过长导致 431，将大块内容放入 localStorage
      try {
        const payload = {
          title: this.titleInput,
          finalResult,
          methodContent,
          baseContent,
          chosenSide,
          taskName: this.currentTaskName
        };
        localStorage.setItem('finalResultPayload', JSON.stringify(payload));
      } catch (e) { /* ignore */ }
      this.$router.push({ name: 'FinalResult', query: { from: 'template', chosenSide } });
    },
    async loadSolutionsFromBackend() {
      try {
        // 确保已取到任务名
        this.getCurrentTaskName();
        if (!this.currentTaskName) return;
        const url = `/api/results-solutions/${encodeURIComponent(this.currentTaskName)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const list = data?.solutions || [];
        if (!Array.isArray(list) || !list.length) return;
        let rec = null;
        const queryAnalysisId = this.$route.query.analysisId;
        if (queryAnalysisId) {
          rec = list.find(r => String(r.analysis_id) === String(queryAnalysisId));
        }
        if (!rec) rec = list[0];
        if (!rec) return;
        this.contentInputLeft = rec.solution1_content || '';
        this.contentInputRight = rec.solution2_content || '';
        this.titleInput = rec.solution1_title || this.titleInput;
      } catch (e) {
        console.warn('加载后端 solutions 失败:', e?.message);
      }
    }
  }
};
</script>

<style scoped>
.template-selection {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 32px 0 32px 0;
  background: linear-gradient(135deg, #e0e7ff 0%, #f9f9f9 100%);
  border-radius: 16px;
  box-shadow: 0 6px 32px rgba(60, 60, 120, 0.10);
  min-height: 100vh;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 32px;
  background: linear-gradient(90deg, #007bff 0%, #5a8cff 100%);
  color: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(60, 60, 120, 0.10);
}

.page-body {
  display: flex;
  gap: 16px;
  align-items: stretch;
  padding: 0 16px 16px 16px;
}

/* 复用 Results 风格的左侧边栏 */
.sidebar-left {
  width: 260px;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 20px 16px 16px 16px;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  position: relative;
  border-radius: 12px;
  transition: width 0.3s ease, padding 0.3s ease;
}

.sidebar-left.collapsed {
  width: 48px;
  padding: 20px 6px;
  align-items: center;
}

.sidebar-left h3 {
  margin: 0 0 16px 0;
  font-size: 1.1em;
  text-align: center;
  color: #ecf0f1;
  border-bottom: 2px solid rgba(255,255,255,0.3);
  padding-bottom: 8px;
  font-weight: 600;
}

.sidebar-left .task-no {
  background: rgba(255, 255, 255, 0.15);
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 12px;
}

.sidebar-left .task-no .no {
  font-weight: 800;
  color: #f39c12;
}

.sidebar-left .task-name {
  font-weight: 600;
  font-size: 0.98em;
  word-break: break-word;
}

.sidebar-left .mini {
  color: #ecf0f1;
  font-weight: 700;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.toggle-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  cursor: pointer;
  font-size: 1.2em;
  color: #f1f1f1;
  transition: color 0.2s ease;
}

.toggle-icon:hover { color: #f39c12; }

.task-record-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 0;
  background: linear-gradient(90deg, #6c757d 0%, #868e96 100%);
  color: white;
  border-radius: 8px;
  margin: 0 32px 16px 32px;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
  font-size: 1.1em;
  font-weight: 600;
}

.logo {
  font-size: 1.7em;
  font-weight: bold;
  letter-spacing: 2px;
}

.content {
  padding: 24px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(60, 60, 120, 0.10);
  flex: 1;
}

.editor-window {
  width: 97%;
  min-height: 340px;
  background: #fff;
  padding: 28px 28px 60px 28px;
  border-radius: 14px;
  box-shadow: 0 4px 18px rgba(60, 60, 120, 0.10);
  margin-bottom: 32px;
  position: relative;
}

/* AI 分析区样式 */
.ai-section {
  width: 97%;
  background: #fff;
  padding: 24px;
  border-radius: 14px;
  box-shadow: 0 4px 18px rgba(60, 60, 120, 0.10);
  margin-bottom: 24px;
}

.ai-loading { color: #5a5a89; }

.ai-grid { display: flex; gap: 24px; }
.ai-card {
  flex: 1;
  background: linear-gradient(135deg, #f0f4ff 0%, #fff 100%);
  padding: 18px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(60,60,120,0.08);
}
.ai-error { color: #c0392b; font-weight: 600; margin: 8px 0; }
.kv { margin: 6px 0; display: flex; gap: 6px; }
.k { color: #2d3a4b; font-weight: 700; }
.v { color: #333; }
.method { margin-top: 10px; }
.method-title { font-weight: 700; color: #2d3a4b; margin-bottom: 6px; }
.method-content { white-space: pre-wrap; background: #fafafa; border: 1px solid #eee; padding: 10px; border-radius: 8px; }

.editor-window h2 {
  margin-top: 0;
  font-size: 1.5em;
  display: flex;
  align-items: center;
  color: #3b3b6d;
  font-weight: 700;
  letter-spacing: 1px;
}

.editor-content {
  display: flex;
  justify-content: space-between;
  gap: 32px;
}

.editor-half {
  width: 48%;
}

.editor-half h3 {
  margin-top: 18px;
  font-size: 1.18em;
  color: #2d3a4b;
  font-weight: 600;
}

.editor-half input[type="text"],
.editor-half textarea {
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  border: 1.5px solid #bfcfff;
  border-radius: 6px;
  font-size: 1.08em;
  background: #f7fafd;
  transition: border-color 0.2s, box-shadow 0.2s;
  color: #333;
  font-family: inherit;
  box-shadow: 0 1px 4px rgba(60, 60, 120, 0.06);
}

.editor-half input[type="text"]:focus,
.editor-half textarea:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 2px #e0e7ff;
}

.editor-half textarea {
  resize: vertical;
  min-height: 70px;
}

.confirm-button {
  position: absolute;
  bottom: 24px;
  right: 28px;
  padding: 12px 32px;
  background: linear-gradient(90deg, #007bff 0%, #5a8cff 100%);
  color: white;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  font-size: 1.13em;
  font-weight: 700;
  transition: background 0.3s, box-shadow 0.3s;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
}

.confirm-button:hover {
  background: linear-gradient(90deg, #0056b3 0%, #007bff 100%);
}

.next-button {
  text-align: right;
  margin-top: 28px;
}

.next-button button {
  padding: 12px 32px;
  background: linear-gradient(90deg, #28a745 0%, #5be584 100%);
  color: white;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  font-size: 1.13em;
  font-weight: 700;
  transition: background 0.3s, box-shadow 0.3s;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
}

.next-button button:hover {
  background: linear-gradient(90deg, #218838 0%, #43d477 100%);
}


</style>