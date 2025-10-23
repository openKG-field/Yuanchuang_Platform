<template>
  <div class="outer-container" v-loading="isGenerating" v-bind="loadingProps">
    <div class="combined-container">
      <div class="content">
        <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
          <button class="sidebar-toggle" @click="toggleSidebar">
            <span class="toggle-icon">{{ sidebarCollapsed ? '▶' : '◀' }}</span>
          </button>

          <div class="sidebar-content" v-show="!sidebarCollapsed">
            <h3>任务记录</h3>
            
            <!-- 任务计数器 -->
            <div class="task-stats">
              <p>总任务数: <span class="count">{{ totalTaskCount }}</span></p>
            </div>
            
            <!-- 最近任务列表 -->
            <ul class="task-list">
              <li 
                v-for="(task, index) in recentTasks" 
                :key="index" 
                class="task-item"
                :class="{ active: task === currentTaskName }"
                @click="selectParentTask(task)"
              >
                <div class="parent-row">
                  <span class="task-name h1">{{ task }}</span>
                  <span class="task-actions">
                    <el-icon class="delete-icon" title="删除该任务" @click.stop="handleDeleteTask(task)">
                      <component :is="'el-icon-delete'" />
                    </el-icon>
                  </span>
                </div>
                <div v-if="task === currentTaskName" class="subtasks-list">
                  <div class="sub-task-header">子任务</div>
                  <button
                    v-for="st in planTasks"
                    :key="st.id"
                    class="dynamic-task-button h2"
                    :class="{ active: activePlanTaskId === st.id }"
                    @click.stop="selectPlanTask(st)"
                  >
                    <span class="task-text">{{ st.name }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </aside>
        <div class="main-content">
          <h2 class="main-title">检索，调用检索Agent</h2>
          <div class="section" v-if="activePlanTaskId">
            <h3>AI 对当前子任务（{{ activePlanTaskName }}）的思考</h3>
            <div class="ai-box">
              <pre v-if="aiLoading">AI 正在思考...</pre>
              <template v-else>
                <pre v-if="!currentAiText">点击左侧子任务以生成回答</pre>
                <div v-else>
                  <ul class="ai-points">
                    <li v-for="(pt, idx) in parsedAiPoints" :key="idx">
                      <input type="checkbox" v-model="selectedAiPoints" :value="pt" />
                      <span class="point-text">{{ pt }}</span>
                    </li>
                  </ul>
                </div>
              </template>
            </div>
          </div>
          <div class="section">
            <h3>问题清单（按子任务分组）</h3>
            <div v-if="problemsLoading">加载中…</div>
            <template v-else>
              <div v-if="!hasProblems">暂无数据</div>
              <div v-for="(items, subName) in groupedProblems" :key="subName" class="problem-group">
                <h4 class="subtask-title">{{ subName }}</h4>
                <ul class="issues-list">
                  <li v-for="pb in items" :key="pb.id">
                    <label>
                      <input type="checkbox" :value="pb.id" v-model="selectedProblemIds" />
                      <span class="problem-text">{{ pb.problem_description }}</span>
                      <span v-if="pb.is_critical" class="tag-critical">关键</span>
                    </label>
                  </li>
                </ul>
              </div>
            </template>
          </div>
          <!-- 确认按钮 -->
          <div class="continue-button">
            <button @click="confirmAndRedirect" :disabled="isGenerating">确认</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ElIcon } from 'element-plus';
import { ArrowRight, ArrowLeft, Delete } from '@element-plus/icons-vue';
import { getAIResponse } from '../../apiService';
import { useLoading, defaultLoadingConfig, getLoadingProps } from '@/utils';
import { useSidebar } from '@/utils/sidebarMixin';

export default {
  name: "NewIntegration",
  components: {
    ElIcon,
    'el-icon-arrow-right': ArrowRight,
    'el-icon-arrow-left': ArrowLeft,
    'el-icon-delete': Delete,
  },
  setup() {
    // 使用Loading工具
    const {
      isGenerating,
      startGenerating,
      stopGenerating,
      isLoading
    } = useLoading();

    // 获取Loading配置属性
    const loadingProps = getLoadingProps(defaultLoadingConfig);

    // 使用侧栏 composable
    const { sidebarCollapsed, toggleSidebar } = useSidebar();

    return {
      isGenerating,
      startGenerating,
      stopGenerating,
      isLoading,
      loadingProps,
      sidebarCollapsed,
      toggleSidebar
    };
  },
  data() {
    return {
      selectedTask: 'taskid1',
      taskid2Visible: false,
      parsedIssues: [], // 用于存储解析后的问题列表
      selectedIssues: [], // 用于存储用户选择的问题
      API_URL: '/api/ai', // 替换为实际的 API 地址
      totalTaskCount: 0, // 总任务数
      recentTasks: [], // 最近的任务列表
      currentTaskName: '', // 当前任务名称
      // plan & AI
      planTasks: [], // 与 TaskManager 的三个子任务同步
      activePlanTaskId: null,
      aiAnswers: {}, // {subTaskId: text}
      aiLoading: false,
      // AI 要点选择
      selectedAiPoints: [],
      // 问题清单
      problemsLoading: false,
      groupedProblems: {}, // { sub_task_name: [{id,problem_description,is_critical,is_selected}]} 
      selectedProblemIds: [],
    };
  },
  computed: {
    activePlanTaskName() {
      const t = this.planTasks.find(x => x.id === this.activePlanTaskId);
      return t ? t.name : '';
    },
    // 当前 AI 原始文本
    currentAiText() {
      return this.activePlanTaskId ? (this.aiAnswers[this.activePlanTaskId] || '') : '';
    },
    // 将 markdown 文本解析为“要点”数组，只识别每行前的项目符号/编号/清单
    parsedAiPoints() {
      const text = this.currentAiText || '';
      if (!text) return [];
      const lines = text.split(/\r?\n/);
      const points = [];
      let inCode = false;
      for (let raw of lines) {
        const line = String(raw).trim();
        if (line.startsWith('```')) { inCode = !inCode; continue; }
        if (inCode || !line) continue;
        // 匹配 - [ ] / - / * / • / 1. / 1)
        const m = line.match(/^\s*(?:[-*•]\s+\[.?\]\s*|[-*•]\s+|\d+[\.)]\s+)(.+)$/);
        if (m && m[1]) {
          const item = m[1].replace(/\s+$/, '');
          points.push(item);
        }
      }
      // 若未解析到任何要点，兜底按句号/分号粗略切分
      if (points.length === 0) {
        return text.split(/[；;。\n]/).map(s => s.trim()).filter(Boolean).slice(0, 20);
      }
      return points;
    },
    // 展示用问题列表：仅显示“AI要点中被选中的项”；未选择时为空
    displayIssues() {
      // 已不在页面展示，仅保留兼容逻辑
      const extras = Array.isArray(this.selectedAiPoints) ? this.selectedAiPoints : [];
      const set = new Set(extras.map(s => String(s).trim()));
      return Array.from(set).filter(Boolean);
    },
    hasProblems() {
      return Object.keys(this.groupedProblems || {}).length > 0;
    }
  },
  created() {
    const issues = this.$route.query.issues || '';
    this.parsedIssues = issues.split('\n').filter((issue) => issue.trim() !== '');
    
    // 加载任务数据
    this.loadDialogTasks();
    // 获取当前任务名称（优先用路由带来的 currentTask）
    this.getCurrentTaskName();
  // 按任务加载三个子任务
  this.loadTaskPlanFromBackend();
  // 加载问题清单
  this.loadProblems();
  },
  
  methods: {
    // 统一 fetch，若 Vite 代理失败（404 或返回 HTML），回退直连后端
    async safeFetch(input, init) {
      const res = await fetch(input, init);
      const needFallback = res.status === 404 || ((res.headers.get('content-type') || '').includes('text/html'));
      if (!needFallback) return res;
      try {
        const url = typeof input === 'string' ? input : input.url;
        if (url?.startsWith('/api/')) {
          const fallbackUrl = `http://localhost:3000${url}`;
          return await fetch(fallbackUrl, init);
        }
      } catch (_) {}
      return res;
    },
    // 删除任务（本地列表 + 后端数据库）
    async handleDeleteTask(taskName) {
      try {
        const ok = confirm(`确定删除任务 “${taskName}” 及其相关数据？此操作不可撤销。`);
        if (!ok) return;
        // 调用后端删除
        const resp = await fetch(`/api/tasks/by-name/${encodeURIComponent(taskName)}`, {
          method: 'DELETE'
        });
        if (!resp.ok) {
          const msg = await resp.text().catch(() => '');
          throw new Error(`后端删除失败: ${resp.status} ${msg}`);
        }

        // 更新本地存储中的任务列表
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        const nextTasks = dialogTasks.filter(t => t !== taskName);
        localStorage.setItem('dialogTasks', JSON.stringify(nextTasks));

        // 如果当前任务被删除，切换到其它任务
        if (this.currentTaskName === taskName) {
          this.currentTaskName = nextTasks[nextTasks.length - 1] || '';
          localStorage.setItem('currentDialogTask', this.currentTaskName || '');
        }

        // 刷新侧边栏列表与计数
        this.loadDialogTasks();

        // 如果还有任务，刷新对应的计划；没有则清空当前显示
        if (this.currentTaskName) {
          await this.loadTaskPlanFromBackend();
        } else {
          this.planTasks = [];
          this.activePlanTaskId = null;
          this.aiAnswers = {};
          this.selectedAiPoints = [];
        }
      } catch (e) {
        console.error(e);
        alert('删除失败，请稍后重试。');
      }
    },
    
    /**
     * 加载Dialog.vue的任务数据
     */
    loadDialogTasks() {
      try {
        // 从localStorage获取Dialog.vue保存的任务数据
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        this.totalTaskCount = dialogTasks.length;
        // 只显示最近的5个任务
        this.recentTasks = dialogTasks.slice(-5).reverse();
      } catch (error) {
        console.error('加载任务数据失败:', error);
        this.totalTaskCount = 0;
        this.recentTasks = [];
      }
    },
    
    /**
     * 获取当前任务名称
     */
    getCurrentTaskName() {
      try {
        // 路由优先
        const routeTask = this.$route.query.currentTask;
        if (routeTask) {
          this.currentTaskName = routeTask;
          return this.currentTaskName;
        }
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        const currentTask = localStorage.getItem('currentDialogTask');
        
        if (currentTask && dialogTasks.includes(currentTask)) {
          this.currentTaskName = currentTask;
        } else if (dialogTasks.length > 0) {
          this.currentTaskName = dialogTasks[dialogTasks.length - 1];
        } else {
          this.currentTaskName = 'NewIntegration任务';
        }
        return this.currentTaskName;
      } catch (error) {
        console.error('获取任务名称失败:', error);
        this.currentTaskName = 'NewIntegration任务';
        return this.currentTaskName;
      }
    },
    // 选择父任务
    selectParentTask(taskName) {
      if (this.isGenerating) return; // 禁用交互
      this.currentTaskName = taskName;
      this.loadTaskPlanFromBackend();
    },
    // 选择子任务并触发 AI
    async selectPlanTask(task) {
      if (this.isGenerating) return; // 禁用交互
      this.activePlanTaskId = task.id;
      // 若已有答案则不重复请求
      if (this.aiAnswers[task.id]) return;
      // 若后端已存有该子任务内容，则直接复用
      const saved = (this.planTasks || []).find(t => String(t.id) === String(task.id))?.content;
      if (saved && String(saved).trim()) {
        this.aiAnswers = { ...this.aiAnswers, [task.id]: String(saved) };
        return;
      }
      this.aiLoading = true;
      try {
        const userPrompt = [
          `当前任务：${this.currentTaskName}`,
          `子任务：${task.name}`,
          '请思考该子任务可能存在的关键问题、风险点与信息缺口，并以要点形式给出具体检查清单与建议。'
        ].join('\n');
    const text = await getAIResponse(userPrompt);
    this.aiAnswers = { ...this.aiAnswers, [task.id]: text };
        // 生成后立即持久化为一个版本
        await this.persistAiAnswer(task, text, 'AI生成');
      } catch (e) {
        const fallback = 'AI 调用失败，请稍后重试。';
    this.aiAnswers = { ...this.aiAnswers, [task.id]: fallback };
      } finally {
        this.aiLoading = false;
      }
    },
    // 加载问题清单（按子任务分组），默认选中 is_selected 或 is_critical 的问题
    async loadProblems() {
      const taskName = this.getCurrentTaskName();
      if (!taskName) return;
      this.problemsLoading = true;
      try {
        const resp = await this.safeFetch(`/api/task-problems/${encodeURIComponent(taskName)}`);
        if (!resp.ok) throw new Error(`加载问题失败: ${resp.status}`);
        const data = await resp.json();
        const groups = data?.problemsBySubTask || {};
        this.groupedProblems = groups;
        const defaults = [];
        for (const k of Object.keys(groups)) {
          for (const pb of groups[k]) {
            if (pb.is_selected || pb.is_critical) defaults.push(pb.id);
          }
        }
        this.selectedProblemIds = Array.from(new Set(defaults));
      } catch (e) {
        console.warn('加载问题清单异常:', e);
      } finally {
        this.problemsLoading = false;
      }
    },
    // 保存当前勾选问题到后端
    async saveProblemSelection() {
      const taskName = this.getCurrentTaskName();
      if (!taskName) return;
      try {
        const resp = await this.safeFetch('/api/task-problems/selection', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskName, selectedIds: this.selectedProblemIds })
        });
        if (!resp.ok) throw new Error(`保存选择失败: ${resp.status}`);
      } catch (e) {
        console.warn('保存选择异常:', e);
      }
    },
    
    /**
     * 保存分析数据到数据库
     */
  async saveAnalysisToDatabase(aiSolution = '', selectedIssuesStr = null) {
      try {
        const response = await fetch('/api/save-integration-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskName: this.currentTaskName,
            allIssues: this.parsedIssues.join('\n'),
      selectedIssues: selectedIssuesStr ?? this.selectedIssues.join('\n'),
            aiSolution: aiSolution
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('NewIntegration分析已保存到数据库，ID:', result.id);
          return result.id;
        } else {
          console.error('保存到数据库失败:', response.status);
          return null;
        }
      } catch (error) {
        console.error('数据库保存操作失败:', error);
        return null;
      }
    },
    
    
  async confirmAndRedirect() {
    if (this.isGenerating) return;
        // 根据勾选问题ID汇总问题文本
        const idSet = new Set(this.selectedProblemIds || []);
        const combined = [];
        for (const k of Object.keys(this.groupedProblems || {})) {
          for (const pb of this.groupedProblems[k]) {
            if (idSet.has(pb.id)) combined.push(String(pb.problem_description || '').trim());
          }
        }
        // 合并“AI 要点”中用户手动勾选的项（可选）
        for (const extra of (this.selectedAiPoints || [])) {
          const t = String(extra || '').trim();
          if (t && !combined.includes(t)) combined.push(t);
        }
        if (!combined.length) { alert('请选择至少一个问题！'); return; }
    
    try {
      this.startGenerating();
          // 持久化当前勾选
          await this.saveProblemSelection();
          // 1. 保存选中问题（不再生成 / 依赖 单一综合方案 ai_solution）
          const analysisId = await this.saveAnalysisToDatabase('', combined.join('\n'));

          // 2. 直接在此生成两个“目标解决方案”
          const issuesList = combined.join('\n');
          const baseInstruction = `你将针对下面列出的关键问题生成两个互补的综合技术解决方案。要求：\n1) 每个方案均需包含: 总体目标, 关键问题映射表(问题->对应策略/措施), 分阶段实施步骤(含里程碑), 关键输入与输出, 风险与规避, 度量指标与验收标准, 可扩展/演进方向。\n2) 方案一：务实、工程化、易落地，强调风险控制与成本/进度。\n3) 方案二：创新、发散，鼓励新技术/差异化路径，提供 2~3 条备选策略分支。\n4) 两个方案都需要确保“每个输入问题”都在映射表或正文中能被追踪。缺少信息可合理假设并用(假设)标记。`;
          const prompt1 = `${baseInstruction}\n\n【输入问题列表】\n${issuesList}\n\n请输出方案一 (务实工程化)。先给<关键问题映射表>(列:问题,策略,对应步骤编号)，然后输出主体结构。`;
          const prompt2 = `${baseInstruction}\n\n【输入问题列表】\n${issuesList}\n\n请输出方案二 (创新发散)。先给<关键问题映射表>(列:问题,创新思路,潜在价值,风险)，然后主体结构需包含2~3条备选策略分支。`;

          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`
          };

          const [r1, r2] = await Promise.all([
            fetch(this.API_URL, { method: 'POST', headers, body: JSON.stringify({ model: 'deepseek-v3', messages: [{ role: 'user', content: prompt1 }], max_tokens: 1800 }) }),
            fetch(this.API_URL, { method: 'POST', headers, body: JSON.stringify({ model: 'deepseek-v3', messages: [{ role: 'user', content: prompt2 }], max_tokens: 1800 }) })
          ]);

          const parseContent = async (resp) => {
            if (!resp || resp.status !== 200) return 'AI响应错误，请稍后再试。';
            try { const d = await resp.json(); return d?.choices?.[0]?.message?.content?.trim() || 'AI未返回内容。'; } catch { return '解析失败。'; }
          };

          const solution1 = await parseContent(r1);
          const solution2 = await parseContent(r2);

          // 3. 立即保存到 results 表（若后端允许多次调用可加去重逻辑）
          try {
            await fetch('/api/save-results', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskName: this.currentTaskName,
                analysisId,
                selectedIssues: combined.join('\n'),
                solution1Title: '目标解决方案一',
                solution1Content: solution1,
                solution2Title: '目标解决方案二',
                solution2Content: solution2
              })
            });
          } catch (e) { console.warn('保存 results 失败(忽略继续):', e); }

          // 4. 写入本地缓存供 Results 直接展示
          try {
            localStorage.setItem(`results:payload:${this.currentTaskName}`, JSON.stringify({
              taskName: this.currentTaskName,
              analysisId,
              selectedIssues: combined.join('\n'),
              articles: [
                { selected: false, date: new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'}), title: '目标解决方案一', content: solution1 },
                { selected: false, date: new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'}), title: '目标解决方案二', content: solution2 }
              ],
              when: Date.now()
            }));
          } catch(_) {}

          // 5. 跳转至 Results 展示（不再需要 baseAiSolution）
          this.$router.push({ name: 'Results', query: { analysisId, selectedIssues: combined.join('\n'), taskName: this.currentTaskName } });
        } catch (e) {
          console.error('生成两个综合方案失败:', e);
          alert('生成方案失败，请重试。');
        } finally {
          this.stopGenerating();
        }
    },
    
    /**
     * 更新数据库记录，添加AI解决方案
     */
    async updateAnalysisWithSolution(id, aiSolution) {
  // 已废弃：不再单独更新单一综合方案列
  return;
    },
    // 将 AI 答案持久化为子任务内容的一个版本
    async persistAiAnswer(task, content, note = 'AI生成') {
      try {
        const taskName = this.getCurrentTaskName();
        const body = {
          subTaskId: task.id,
          subTaskName: task.name,
          content,
          note,
          editor: 'AI'
        };
        const resp = await fetch(`/api/task-plan/${encodeURIComponent(taskName)}/edit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!resp.ok) {
          console.warn('保存 AI 答案为版本失败:', resp.status);
        }
      } catch (e) {
        console.warn('持久化 AI 答案异常:', e);
      }
    }
    ,
    // 从后端优先获取三个子任务；失败回退 session
    async loadTaskPlanFromBackend() {
      const taskName = this.getCurrentTaskName();
      try {
        const resp = await this.safeFetch(`/api/task-plan/${encodeURIComponent(taskName)}`);
        if (resp.ok) {
          const ct = resp.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const data = await resp.json();
            if (Array.isArray(data.tasks) && data.tasks.length) {
              this.planTasks = data.tasks;
              this.activePlanTaskId = this.planTasks[0]?.id || null;
              // 预载已存内容到 aiAnswers 以便直接复用
              const pre = {};
              for (const t of this.planTasks) {
                if (t?.id && t?.content && String(t.content).trim()) {
                  pre[t.id] = String(t.content);
                }
              }
              if (Object.keys(pre).length) this.aiAnswers = { ...this.aiAnswers, ...pre };
              return;
            }
          }
        }
      } catch (_) {}
      // 若 task-plan 为空，尝试改用 sub-tasks
      await this.loadPlanFromSubTasks(taskName);
      // 会话回退
      try {
        const raw = sessionStorage.getItem('taskPlan');
        if (raw) {
          const plan = JSON.parse(raw);
          if (Array.isArray(plan.tasks)) {
            this.planTasks = plan.tasks;
            this.activePlanTaskId = this.planTasks[0]?.id || null;
            const pre = {};
            for (const t of this.planTasks) {
              if (t?.id && t?.content && String(t.content).trim()) {
                pre[t.id] = String(t.content);
              }
            }
            if (Object.keys(pre).length) this.aiAnswers = { ...this.aiAnswers, ...pre };
          }
        }
      } catch (e) {
        console.warn('回退加载任务规划失败:', e);
      }
    },
    async loadPlanFromSubTasks(taskName) {
      try {
        const resp = await this.safeFetch(`/api/sub-tasks/${encodeURIComponent(taskName)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const list = Array.isArray(data?.subTasks) ? data.subTasks : [];
        if (!list.length) return;
        this.planTasks = list.map((r, idx) => ({
          id: idx + 1,
          name: r.sub_task_name,
          content: `### ${r.sub_task_name}\n\n**难度**：${r.difficulty || 'medium'}\n\n**描述**：${r.description || '—'}`
        }));
        this.activePlanTaskId = this.planTasks[0]?.id || null;
      } catch (_) {}
    }
  },
  watch: {
  }
};
</script>

<style scoped>
@import '../utils/sidebar.css';

.outer-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200vh;
  background-color: #f0f0f0;
}

.combined-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 20px;
  background-color: #ffffff; /* 修改为白色背景 */
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* 增加阴影 */
  display: flex;
  flex-direction: column;
  width: 100%; /* 调整宽度 */
  max-width: 1200px; /* 最大宽度 */
  height: 90%; /* 调整高度 */
}

.content {
  display: flex;
  flex: 1;
}

/* 任务列表样式 */
.task-stats {
  background: rgba(255, 255, 255, 0.15);
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 12px;
}

.task-stats p {
  margin: 0;
  font-size: 1.1em;
  color: #ecf0f1;
  font-weight: 500;
}

.count {
  font-weight: 800;
  color: #f39c12;
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  max-height: 400px;
}

.task-item {
  padding: 10px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  border-left: 4px solid #3498db;
  cursor: pointer;
  transition: all 0.2s;
}

.task-item:hover {
  background: rgba(255, 255, 255, 0.18);
  border-left-color: #e74c3c;
  transform: translateX(2px);
}

.task-item.active {
  background: rgba(255, 255, 255, 0.22);
  border-left-color: #f39c12;
}

.task-name {
  font-size: 0.95em;
  color: #ecf0f1;
  font-weight: 500;
}

.task-name.h1 { 
  font-weight: 700; 
}

.parent-row { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  justify-content: space-between; 
}

.delete-icon { 
  color: #c0392b; 
  cursor: pointer; 
}

.delete-icon:hover { 
  color: #e74c3c; 
}

.subtasks-list { 
  margin-top: 10px; 
}

.sub-task-header { 
  font-size: 0.9em; 
  color: #bdc3c7; 
  margin-bottom: 6px; 
}

.dynamic-task-button { 
  width: 100%; 
  padding: 8px 10px; 
  border-radius: 6px; 
  cursor: pointer; 
  border-left: 4px solid #3498db; 
  background: rgba(255, 255, 255, 0.1); 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 4px;
  border: none;
  color: #ecf0f1;
}

.dynamic-task-button:hover { 
  background: rgba(255, 255, 255, 0.15); 
}

.dynamic-task-button.active { 
  background: rgba(52, 152, 219, 0.3); 
  border-left-color: #f39c12;
}

.dynamic-task-button .task-text { 
  flex: 1; 
  text-align: left; 
}

.ai-box { background:#fff; border:1px solid #ddd; border-radius:6px; padding:12px; white-space:pre-wrap; }
.ai-points { list-style: none; padding-left: 0; margin: 0; }
.ai-points li { margin: 6px 0; display: flex; align-items: flex-start; gap: 8px; }
.ai-points .point-text { flex: 1; word-break: break-word; overflow-wrap: anywhere; }

.issues-list { list-style: disc; padding-left: 20px; }
.issues-list li { margin: 6px 0; word-break: break-word; overflow-wrap: anywhere; }

.problem-group { margin-bottom: 12px; }
.subtask-title { font-size: 1.05em; margin: 8px 0; color: #333; }
.problem-text { margin-left: 6px; }
.tag-critical { display: inline-block; margin-left: 8px; font-size: 12px; color: #fff; background: #d9534f; padding: 1px 6px; border-radius: 10px; }

/* 防止 AI 文本溢出或把容器拉得过大 */
.ai-box pre {
  white-space: pre-wrap;        /* 保留换行并允许自动换行 */
  word-break: break-word;       /* 遇到长单词/URL 也可断行 */
  overflow-wrap: anywhere;      /* 无空格时也可以在任意位置断行 */
  max-width: 100%;
  max-height: 50vh;             /* 限制高度，避免页面被撑爆 */
  overflow-y: auto;             /* 超出则内部滚动 */
  overflow-x: hidden;           /* 禁止横向滚动条 */
}

.main-content {
  flex: 2; /* 缩小宽度 */
  padding: 20px;
  background-color: #e9ecef;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* 修改为顶部对齐 */
}

.main-title {
  font-size: 2em;
  color: #333;
  margin-bottom: 20px;
}

.section {
  margin-bottom: 20px;
  width: 90%;
  padding: 20px; /* 增加内边距 */
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 1.5em;
  text-align: center;
}

.continue-button {
  text-align: center;
  margin-top: 20px; /* 添加顶部外边距 */
}

.continue-button button {
  padding: 12px 24px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.continue-button button:hover {
  background-color: #218838;
  transform: scale(1.05);
}

/* 响应式 */
@media (max-width: 768px) {
  .content { 
    flex-direction: column; 
  }
  .main-content { 
    padding-left: 0; 
  }
}
</style>