<template>
  <div class="template-wrapper">
    <header>
      <!-- 删除AI代理的标题 -->
    </header>
    <main class="main-content">
      <aside :class="['sidebar', { collapsed: taskListCollapsed }]">
        <div class="task-list">
          <div class="toggle-icon">
            <el-icon @click="toggleTaskList">
              <component :is="taskListCollapsed ? 'el-icon-arrow-right' : 'el-icon-arrow-left'" />
            </el-icon>
          </div>
          <h2 v-if="!taskListCollapsed">任务记录</h2>
          <div v-if="!taskListCollapsed" class="task-counter">
            <p>总任务数: <span class="count">{{ totalTaskCount }}</span></p>
          </div>
          <ul v-if="!taskListCollapsed" class="task-history">
            <li
              v-for="(task, index) in recentTasks"
              :key="index"
              class="task-item parent-task"
              :class="{ 'active': selectedParentTask === task }"
            >
              <div class="parent-row" @click="selectParentTask(task)">
                <el-icon class="expand-icon" @click.stop="toggleParentExpand(task)">
                  <component :is="isParentExpanded(task) ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" />
                </el-icon>
                <span class="task-name h1">{{ task }}</span>
                <span class="delete-icon" @click.stop="deleteParentTask(task)">🗑️</span>
              </div>
              <!-- 二级标题（子任务） -->
              <div v-if="isParentExpanded(task)" class="subtasks-list">
                <div class="sub-task-header">子任务</div>
                <button
                  v-for="pt in (selectedParentTask === task ? planTasks : [])"
                  :key="pt.id"
                  class="dynamic-task-button h2"
                  :class="{ active: activePlanTaskId === pt.id }"
                  @click.stop="selectPlanTask(pt)"
                >
                  <span class="task-text">{{ pt.name }}</span>
                </button>
              </div>
            </li>
          </ul>
        </div>
        <!-- 只保留添加任务按钮 -->
        <div class="left-bottom-add">
          <button @click.stop="addTask">添加任务</button>
        </div>
      </aside>
      <section class="template-container">
        <!-- 可折叠的 AI 回复板块 -->
        <div ref="aiPanel" class="ai-response">
          <h2>子任务内容</h2>
          <div v-show="aiPanelExpanded" class="ai-content">
            <!-- 编辑/浏览模式切换 -->
            <div v-if="activePlanTaskId">
              <!-- 框架切换：主演化/主系统/主作用 -->
              <div class="framework-tabs">
                <button
                  v-for="opt in frameworkOptions"
                  :key="opt.key"
                  class="tab-btn"
                  :class="{ active: selectedFramework === opt.key }"
                  :disabled="frameworkLoading"
                  @click="switchFramework(opt.key)"
                >{{ opt.label }}</button>
                <span class="tab-spacer" />
                <span v-if="frameworkLoading" style="color:#888;font-size:12px;">自动生成中…</span>
              </div>
              <div v-if="!isEditingPlan">
                <VueMarkdownIt v-if="currentPlanContent" class="ai-text" :source="currentPlanContent" />
                <div style="margin-top:12px; display:flex; gap:8px;">
                  <button class="continue-button" @click.stop="() => { isEditingPlan = true; editablePlanContent = currentPlanContent; }">编辑</button>
                  <button class="continue-button" @click.stop="showPlanVersions">历史</button>
                </div>
              </div>
              <div v-else>
                <textarea v-model="editablePlanContent" style="width:100%;min-height:200px;" />
                <div style="margin-top:12px; display:flex; gap:8px;">
                  <button class="continue-button" @click.stop="() => saveCurrentPlanContent('用户编辑')">保存</button>
                  <button class="continue-button" @click.stop="() => { isEditingPlan = false; editablePlanContent = currentPlanContent; }">取消</button>
                </div>
              </div>
            </div>
            <!-- 无选中子任务时不再显示 Final AI Response 兜底内容 -->
          </div>
        </div>

  <div ref="tasks" class="tasks">
          <h2>已添加任务</h2>
          <ul v-show="tasksPanelExpanded">
            <!-- 新增：展示三个子任务的简要列表 -->
            <li v-for="pt in planTasks" :key="pt.id">{{ pt.name }}</li>
          </ul>
        </div>
        
        <footer class="right-footer">
          <button class="continue-button" :disabled="isAnalyzing || isDecomposing" @click="handleContinue">
            {{ isAnalyzing ? 'AI 正在分析…' : '继续' }}
          </button>
        </footer>
      </section>
    </main>
  </div>
</template>

<script>
import { ElIcon } from 'element-plus';
import { ArrowRight, ArrowLeft, ArrowDown, ArrowUp } from '@element-plus/icons-vue';
import VueMarkdownIt from 'vue3-markdown-it';

export default {
  name: 'TaskManager',
  components: {
    ElIcon,
    'el-icon-arrow-right': ArrowRight,
    'el-icon-arrow-left': ArrowLeft,
    'el-icon-arrow-down': ArrowDown,
    'el-icon-arrow-up': ArrowUp,
      VueMarkdownIt
  },
  data() {
    return {
      taskDetails: {
        area: this.$route.query.area || '',
        audience: this.$route.query.audience || '',
        keywords: this.$route.query.keywords || '',
        tone: this.$route.query.tone || '',
        prompt: this.$route.query.prompt || ''
      },
      selectedTask: 'taskid1',
      taskListCollapsed: false,
  expandedParents: {}, // 记录每个父任务是否展开 { '任务1': true/false }
      taskid2Visible: false,
      currentTime: new Date().toLocaleString(),
      tasksPanelExpanded: true, // 控制已添加任务板块展开/收起
      aiPanelExpanded: true, // 控制AI回复板块展开/收起
      totalTaskCount: 0, // Dialog.vue中的总任务数
      recentTasks: [], // 最近的任务列表
  addedTasks: ['taskid1'], // 已添加的任务列表（保留原有）
      taskManagerId: null, // 数据库中的记录ID
      currentTaskName: '', // 当前任务名称
      subTasksMap: {}, // 存储每个父任务对应的子任务列表 { '任务1': ['任务1.1', '任务1.2'], '任务2': [...] }
      selectedParentTask: null, // 当前选中的父任务
  baseTaskNumber: 1, // 基础任务编号
  // 新增：三类子任务与内容
  taskPlan: null,
  planTasks: [], // [{id,name,content}]
  activePlanTaskId: null,
  // 框架与内容缓存
  selectedFramework: 'trend',
  frameworkOptions: [
    { key: 'trend', label: '主演化（趋势分析）' },
    { key: 'system', label: '主系统（九宫格+因果）' },
    { key: 'fop', label: '主作用（FOP分析）' }
  ],
  frameworkLoading: false,
  batchFrameworkEnsured: false,
  contentCache: {}, // { [subTaskId]: { trend: md, system: md, fop: md } }
  // 编辑态
  isEditingPlan: false,
  editablePlanContent: '',
  // 新增：AI 拆解与分析状态/数据
  isDecomposing: false,
  isAnalyzing: false,
  subTasksRaw: []
    };
  },
  computed: {
    // 移除了原来的 task1Markdown 和 task2Markdown 计算属性
    // 现在使用 generateTaskMarkdown 方法动态生成
    currentPlanContent() {
      if (!this.planTasks || !this.activePlanTaskId) return '';
      const cached = this.contentCache?.[this.activePlanTaskId]?.[this.selectedFramework];
      if (cached) return cached;
      const found = this.planTasks.find(t => t.id === this.activePlanTaskId);
      return found?.content || '';
    },
    hasFrameworkContent() {
      if (!this.activePlanTaskId) return false;
      return !!(this.contentCache?.[this.activePlanTaskId]?.[this.selectedFramework]);
    }
  },
  mounted() {
    // 加载Dialog.vue的任务数据
    this.loadDialogTasks();
    
    // 优先从路由参数获取当前任务名称
    let taskName = this.$route.query.currentTask;
    
    // 如果路由没有传递任务名称，使用默认逻辑
    if (!taskName) {
      taskName = this.getCurrentTaskName();
    }
    
    this.currentTaskName = taskName;
    
    // 设置选中的父任务（确保与当前任务一致）
    if (taskName && this.recentTasks.includes(taskName)) {
      this.selectedParentTask = taskName;
    } else if (this.recentTasks.length > 0) {
      // 如果传递的任务名称不在任务列表中，则选择第一个任务
      this.selectedParentTask = this.recentTasks[0];
      this.currentTaskName = this.recentTasks[0];
    }
    
    console.log(`TaskManager初始化 - 当前任务: ${this.currentTaskName}, 选中父任务: ${this.selectedParentTask}`);
    
    // 加载选中任务的数据
  this.loadTaskData(this.currentTaskName);

  // 优先从后端加载持久化的任务规划，失败再回退session
  this.loadTaskPlanFromBackend();
  // 拆解/加载子任务（后端优先）
  this.ensureSubTasks();
  // 若已有活动子任务，自动尝试加载/生成当前框架内容
  this.$nextTick(() => { this.ensureAllFrameworkContents(); });
  },
  
  // 组件激活时（从其他路由返回时）
  activated() {
    console.log('TaskManager activated - reloading data');
    // 重新加载Dialog任务数据
    this.loadDialogTasks();
    
    // 优先从路由参数获取当前任务名称
    let taskName = this.$route.query.currentTask;
    
    // 如果路由没有传递任务名称，使用默认逻辑
    if (!taskName) {
      taskName = this.getCurrentTaskName();
    }
    
    this.currentTaskName = taskName;
    
    // 设置选中的父任务（确保与当前任务一致）
    if (taskName && this.recentTasks.includes(taskName)) {
      this.selectedParentTask = taskName;
    }
    
    console.log(`TaskManager activated - 当前任务: ${this.currentTaskName}, 选中父任务: ${this.selectedParentTask}`);
    
    // 重新加载选中任务的数据
  this.loadTaskData(taskName);
  // 重新同步任务规划（后端优先）
  this.loadTaskPlanFromBackend();
  // 重新确保子任务存在
  this.ensureSubTasks();
  this.$nextTick(() => { this.ensureAllFrameworkContents(); });
  },
  
  beforeUnmount() {
    // 在组件卸载前确保数据已保存
    if (this.taskManagerId) {
      this.updateDatabase();
    }
  },
  methods: {
    // 判断当前 planTasks 是否为 Template.vue 生成的“三大框架”占位（id 为 trend/system/fop）
    isFrameworkPlanList(list) {
      const l = Array.isArray(list) ? list : [];
      if (l.length !== 3) return false;
      return l.every(t => ['trend', 'system', 'fop'].includes(String(t.id)));
    },
    // 父任务是否展开
    isParentExpanded(taskName) {
      return !!this.expandedParents[taskName];
    },
    // 切换父任务展开/收起
    toggleParentExpand(taskName) {
      this.$set ? this.$set(this.expandedParents, taskName, !this.expandedParents[taskName])
                : (this.expandedParents = { ...this.expandedParents, [taskName]: !this.expandedParents[taskName] });
    },
    // 从计划内容中提炼要点，供下一步页面打勾选择
    buildIssuesFromPlan() {
      const issues = [];
      const pushClean = (line) => {
        if (!line) return;
        const cleaned = String(line)
          .replace(/^\s*[#>*\-•\d\)\.]\s*/, '')
          .replace(/[`*_>~]/g, '')
          .trim();
        if (cleaned && !issues.includes(cleaned)) issues.push(cleaned);
      };
      (this.planTasks || []).forEach(t => {
        const content = (t && t.content) ? String(t.content) : '';
        if (content) {
          const lines = content.split(/\r?\n/).filter(Boolean);
          for (const ln of lines) {
            if (/^\s*([#>*\-•]|\d+\.|\d+\))/.test(ln)) pushClean(ln);
            if (issues.length >= 12) break;
          }
        }
        if (issues.length < 3) pushClean(t?.name);
      });
      // 额外兜底：从表单详情中拆词
      if (issues.length === 0) {
        const extra = [this.taskDetails?.keywords, this.taskDetails?.prompt, this.taskDetails?.area]
          .filter(Boolean)
          .join('\n')
          .split(/[，,;；\n]/)
          .map(s => s.trim())
          .filter(Boolean);
        extra.slice(0, 8).forEach(pushClean);
      }
      return issues.slice(0, 12);
    },
    // 点击继续：保存子任务 → AI 分析问题 → 保存问题 → 跳转集成分析
    async handleContinue() {
      try {
        const taskName = this.getCurrentTaskName();
        // 兜底：若还未有子任务，先确保存在
        await this.ensureSubTasks();
        // 在继续前，为所有子任务生成并保存三种框架内容（顺序执行，保证都落库）
        try {
          await this.generateFrameworksForAllSubTasks();
        } catch (e) {
          console.warn('批量生成三框架发生问题（已忽略，后续继续流程）:', e?.message || e);
        }
        // 保存最新子任务到后端（幂等）
        await this.saveSubTasksBatch(taskName);
        // AI 分析所有子任务问题
        await this.analyzeAndContinue(taskName);
      } catch (e) {
        console.error('继续流程失败:', e);
      }
    },
    // 统一 fetch，若 Vite 代理失败（404 或返回 HTML），回退直连后端
    async safeFetch(input, init) {
      let res;
      let firstError = null;
      try {
        res = await fetch(input, init);
      } catch (err) {
        firstError = err;
      }
      const url = typeof input === 'string' ? input : input.url;
      const isApi = typeof url === 'string' && url.startsWith('/api/');
      const shouldTryFallback = !!firstError || (res && (res.status === 404 || (res.headers.get('content-type') || '').includes('text/html')));
      if (isApi && shouldTryFallback) {
        try {
          const fallbackUrl = `http://localhost:3000${url}`;
          return await fetch(fallbackUrl, init);
        } catch (_) {
          // ignore and return original result or rethrow
        }
      }
      if (res) return res;
      throw firstError || new Error('请求失败');
    },
    // 为所有子任务生成&保存三种框架内容（主演化/主系统/主作用）
    async generateFrameworksForAllSubTasks() {
      const taskName = this.getCurrentTaskName();
      const list = Array.isArray(this.planTasks) ? this.planTasks : [];
      if (!list.length) return;
      // 顺序执行，避免上游速率限制
      for (const t of list) {
        const subId = t.id;
        const subName = t.name;
        // 对每个框架逐个生成并保存
        for (const opt of this.frameworkOptions) {
          const fw = opt.key; // 'trend' | 'system' | 'fop'
          // 若缓存已有则直接保存（确保版本落库）；否则调用AI生成
          let content = (this.contentCache?.[subId]?.[fw]) || '';
          if (!content) {
            try {
              content = await this.generateFrameworkForTarget(taskName, subId, subName, fw);
            } catch (e) {
              console.warn(`生成 ${subName} 的 ${fw} 失败，使用骨架模板兜底`);
              content = this.buildFrameworkSkeleton(fw, taskName, subName);
            }
          }
          const note = fw === 'trend' ? '主演化(趋势分析)' : fw === 'system' ? '主系统(九宫格+因果)' : '主作用(FOP分析)';
          await this.savePlanContentFor(taskName, subId, subName, content, note);
          // 更新本地缓存
          this.contentCache[subId] = { ...(this.contentCache[subId] || {}), [fw]: content };
        }
      }
    },
    // 生成指定子任务与框架的内容（返回文本，不直接改UI）
    async generateFrameworkForTarget(taskName, subId, subName, framework) {
      const prompt = this.buildFrameworkPrompt(framework, taskName, subName);
      const resp = await this.safeFetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || localStorage.getItem('API_KEY') || ''}`
        },
        body: JSON.stringify({ model: 'deepseek-v3', messages: [{ role:'user', content: prompt }], max_tokens: 1600 })
      });
      if (!resp.ok) {
        const m = await resp.text().catch(()=> '');
        throw new Error(`AI响应错误: ${resp.status} ${m.slice(0,200)}`);
      }
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content?.trim() || '';
      if (!text) throw new Error('AI未返回内容');
      return text;
    },
    // 直接针对目标子任务保存内容为一个版本（不依赖 UI 当前选中项）
    async savePlanContentFor(taskName, subTaskId, subTaskName, content, note = '') {
      try {
        // 先尝试直接编辑
        let resp = await this.safeFetch(`/api/task-plan/${encodeURIComponent(taskName)}/edit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subTaskId, subTaskName, content, note })
        });
        let ct = resp.headers.get('content-type') || '';
        let data = ct.includes('application/json') ? await resp.json() : null;
        if (!resp.ok || !data?.success) {
          // 合并已有 tasks 再回写
          let allTasks = Array.isArray(this.planTasks) ? JSON.parse(JSON.stringify(this.planTasks)) : [];
          try {
            const getResp = await this.safeFetch(`/api/task-plan/${encodeURIComponent(taskName)}`);
            if (getResp.ok) {
              const getCt = getResp.headers.get('content-type') || '';
              if (getCt.includes('application/json')) {
                const getData = await getResp.json();
                if (Array.isArray(getData.tasks) && getData.tasks.length) {
                  allTasks = getData.tasks;
                }
              }
            }
          } catch(_) {}
          const idx2 = allTasks.findIndex(t => String(t.id) === String(subTaskId) || t.name === subTaskName);
          if (idx2 >= 0) {
            allTasks[idx2] = { ...allTasks[idx2], content };
          } else {
            allTasks.push({ id: subTaskId, name: subTaskName || String(subTaskId), content });
          }
          const saveResp = await this.safeFetch('/api/task-plan/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskName, planTasks: allTasks })
          });
          const saveCt = saveResp.headers.get('content-type') || '';
          if (saveResp.ok && saveCt.includes('application/json')) {
            // 再次尝试编辑，写入版本
            resp = await this.safeFetch(`/api/task-plan/${encodeURIComponent(taskName)}/edit`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subTaskId, subTaskName, content, note })
            });
            ct = resp.headers.get('content-type') || '';
            data = ct.includes('application/json') ? await resp.json() : null;
          }
        }
        if (!resp.ok || !data?.success) {
          console.warn('保存子任务版本失败:', data?.message || resp.status, subTaskName, note);
          return false;
        }
        return true;
      } catch (e) {
        console.error('保存子任务版本异常:', subTaskName, e);
        return false;
      }
    },
    showPlanVersions: async function() {
      const v = await this.loadPlanVersions();
      console.log('版本历史', v);
      window.alert(`版本数：${v.length}`);
    },
    async loadTaskPlanFromBackend() {
      try {
        const taskName = this.getCurrentTaskName();
        const resp = await this.safeFetch(`/api/task-plan/${encodeURIComponent(taskName)}`);
        if (resp.ok) {
          const ct = resp.headers.get('content-type') || '';
          if (!ct.includes('application/json')) {
            throw new Error(`非JSON响应: ${ct}`);
          }
          const data = await resp.json();
          if (Array.isArray(data.tasks) && data.tasks.length) {
            this.taskPlan = { tasks: data.tasks };
            this.planTasks = data.tasks;
            this.activePlanTaskId = this.planTasks[0]?.id || null;
            // 绑定同一条记录的ID，保证后续 update 命中同一行
            if (data.id) {
              this.taskManagerId = data.id;
              // 缓存映射：任务名 -> 行ID
              try {
                const map = JSON.parse(localStorage.getItem('tmIdMap') || '{}');
                map[taskName] = data.id;
                localStorage.setItem('tmIdMap', JSON.stringify(map));
              } catch (_) {}
            }
            if (this.selectedParentTask) {
              this.subTasksMap[this.selectedParentTask] = this.planTasks.map(t => t.name);
            }
            // 背景批量生成三框架，确保“主系统/主作用”也会入库（仅对真实子任务触发，避免把 Template 三大框架当成子任务生成）
            if (!this.batchFrameworkEnsured && !this.isFrameworkPlanList(this.planTasks)) {
              this.batchFrameworkEnsured = true;
              setTimeout(() => { this.generateFrameworksForAllSubTasks().catch(()=>{}); }, 0);
            }
            return;
          }
        }
        // 回退到会话
        this.loadTaskPlanFromSession();
      } catch (e) {
        console.warn('后端加载任务规划失败，回退会话:', e.message);
        this.loadTaskPlanFromSession();
      }
    },
    // 读取 sessionStorage 中的任务规划
    loadTaskPlanFromSession() {
      try {
        const raw = sessionStorage.getItem('taskPlan');
        if (!raw) return;
        const plan = JSON.parse(raw);
        if (!Array.isArray(plan.tasks)) return;
        this.taskPlan = plan;
        this.planTasks = plan.tasks;
        // 默认选中第一项
        this.activePlanTaskId = this.planTasks[0]?.id || null;
        // 将 plan 子任务挂接到当前父任务下以便左侧渲染（不影响原有recentTasks显示逻辑）
        if (this.selectedParentTask) {
          this.subTasksMap[this.selectedParentTask] = this.planTasks.map(t => t.name);
        }
        // 背景批量生成三框架，确保“主系统/主作用”也会入库（仅对真实子任务触发）
        if (!this.batchFrameworkEnsured && !this.isFrameworkPlanList(this.planTasks)) {
          this.batchFrameworkEnsured = true;
          setTimeout(() => { this.generateFrameworksForAllSubTasks().catch(()=>{}); }, 0);
        }
        // 若仅有本地会话数据，尝试查询后端以获取该任务的记录ID，便于后续 update
        const taskName = this.getCurrentTaskName();
        this.safeFetch(`/api/task-manager-content/${encodeURIComponent(taskName)}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            const tm = data && data.taskManagerContents && data.taskManagerContents[0];
            if (tm && tm.id) {
              this.taskManagerId = tm.id;
              try {
                const map = JSON.parse(localStorage.getItem('tmIdMap') || '{}');
                map[taskName] = tm.id;
                localStorage.setItem('tmIdMap', JSON.stringify(map));
              } catch (_) {}
            }
          })
          .catch(() => {});
        console.log('已加载任务规划:', this.planTasks.map(t => t.name));
      } catch (e) {
        console.warn('解析任务规划失败:', e);
      }
    },
    // 保存当前选中子任务的 Markdown（写版本）
  async saveCurrentPlanContent(note = '') {
    if (!this.activePlanTaskId) return;
    const content = this.editablePlanContent ?? this.currentPlanContent;
    const taskName = this.getCurrentTaskName();
    const currentTask = (this.planTasks || []).find(t => String(t.id) === String(this.activePlanTaskId));
    const subTaskName = currentTask?.name || null;
      try {
        // 首次尝试直接编辑
        let resp = await this.safeFetch(`/api/task-plan/${encodeURIComponent(taskName)}/edit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subTaskId: this.activePlanTaskId, subTaskName, content, note })
        });
        let ct = resp.headers.get('content-type') || '';
        let data = ct.includes('application/json') ? await resp.json() : null;
        if (!resp.ok || !data?.success) {
          console.warn('保存子任务失败，尝试回退上送计划再重试:', data?.message || resp.status);
          // 在回退保存前，先拉取后端现有全部 tasks 并与当前编辑内容进行合并，避免只保存单项覆盖
          let allTasks = Array.isArray(this.planTasks) ? JSON.parse(JSON.stringify(this.planTasks)) : [];
          try {
            const getResp = await this.safeFetch(`/api/task-plan/${encodeURIComponent(taskName)}`);
            if (getResp.ok) {
              const getCt = getResp.headers.get('content-type') || '';
              if (getCt.includes('application/json')) {
                const getData = await getResp.json();
                if (Array.isArray(getData.tasks) && getData.tasks.length) {
                  allTasks = getData.tasks;
                }
              }
            }
          } catch(_) {}
          // 合并当前子任务内容到 allTasks
          const idx2 = allTasks.findIndex(t => String(t.id) === String(this.activePlanTaskId) || t.name === subTaskName);
          if (idx2 >= 0) {
            allTasks[idx2] = { ...allTasks[idx2], content };
          } else {
            allTasks.push({ id: this.activePlanTaskId, name: subTaskName || String(this.activePlanTaskId), content });
          }
          // 先 upsert 完整计划
          const saveResp = await this.safeFetch('/api/task-plan/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskName, planTasks: allTasks })
          });
          const saveCt = saveResp.headers.get('content-type') || '';
          if (saveResp.ok && saveCt.includes('application/json')) {
            // 再次尝试编辑
            resp = await this.safeFetch(`/api/task-plan/${encodeURIComponent(taskName)}/edit`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subTaskId: this.activePlanTaskId, subTaskName, content, note })
            });
            ct = resp.headers.get('content-type') || '';
            data = ct.includes('application/json') ? await resp.json() : null;
          }
        }
        if (!resp.ok || !data?.success) {
          console.warn('保存子任务失败:', data?.message || resp.status);
          return;
        }
        // 更新本地内容
        const idx = this.planTasks.findIndex(t => t.id === this.activePlanTaskId);
        if (idx !== -1) this.planTasks[idx].content = content;
        this.isEditingPlan = false;
        console.log('子任务已保存, 版本数:', data.versions?.length || 0);
      } catch (e) {
        console.error('保存子任务异常:', e);
      }
    },
    // 获取版本历史
    async loadPlanVersions() {
      if (!this.activePlanTaskId) return [];
      const taskName = this.getCurrentTaskName();
      try {
        const resp = await this.safeFetch(`/api/task-plan/${encodeURIComponent(taskName)}/versions?subTaskId=${encodeURIComponent(this.activePlanTaskId)}`);
        if (resp.ok) {
          const ct = resp.headers.get('content-type') || '';
          if (!ct.includes('application/json')) {
            throw new Error(`非JSON响应: ${ct}`);
          }
          const data = await resp.json();
          return data.versions || [];
        }
      } catch (e) {
        console.warn('加载版本历史失败:', e);
      }
      return [];
    },
    // 切换框架
    switchFramework(key) {
      this.selectedFramework = key;
      this.editablePlanContent = this.currentPlanContent;
      this.ensureFrameworkContent();
    },
    // 保证当前框架有内容（缓存或生成）
    async ensureFrameworkContent() {
      if (!this.activePlanTaskId) return;
      const has = this.contentCache?.[this.activePlanTaskId]?.[this.selectedFramework];
      if (has) return;
      // 若 plan 内已有内容且当前缓存为空，先用 plan.content 显示（避免空白）
      const found = this.planTasks.find(t => t.id === this.activePlanTaskId);
      if (found?.content && !has) {
        this.contentCache[this.activePlanTaskId] = {
          ...(this.contentCache[this.activePlanTaskId] || {}),
          [this.selectedFramework]: found.content
        };
        return;
      }
      // 新增兜底：如果 Template.vue 在 sessionStorage 中已生成“三大框架”，则按所选框架优先使用其内容作为初始值
      try {
        const raw = sessionStorage.getItem('taskPlan');
        if (raw) {
          const plan = JSON.parse(raw);
          const arr = Array.isArray(plan?.tasks) ? plan.tasks : [];
          const seed = arr.find(x => String(x.id) === String(this.selectedFramework));
          const seedContent = typeof seed?.content === 'string' ? seed.content : '';
          if (seedContent) {
            this.contentCache[this.activePlanTaskId] = {
              ...(this.contentCache[this.activePlanTaskId] || {}),
              [this.selectedFramework]: seedContent
            };
            this.editablePlanContent = seedContent;
            // 同步保存为一个版本（标注来源）
            const note = this.selectedFramework === 'trend' ? '主演化(趋势分析)-Template初始'
                      : this.selectedFramework === 'system' ? '主系统(九宫格+因果)-Template初始'
                      : '主作用(FOP分析)-Template初始';
            await this.saveCurrentPlanContent(note);
            return;
          }
        }
      } catch (_) {}
      // 自动生成
      await this.generateFrameworkContent(this.selectedFramework, true);
    },
    // 确保当前子任务三种框架内容都已生成（缺哪个补哪个）
    async ensureAllFrameworkContents() {
      if (!this.activePlanTaskId) return;
      const keys = this.frameworkOptions.map(o => o.key);
      // 先显示当前框架缓存/plan内容，提升感知
      await this.ensureFrameworkContent();
      // 再后台生成其余框架
      for (const k of keys) {
        const has = this.contentCache?.[this.activePlanTaskId]?.[k];
        if (!has) {
          await this.generateFrameworkContent(k, true);
        }
      }
    },
    // AI 生成框架内容
    async generateFrameworkContent(framework, silent = false) {
      if (!this.activePlanTaskId) return;
      const taskName = this.getCurrentTaskName();
      const sub = this.planTasks.find(t => t.id === this.activePlanTaskId);
      if (!sub) return;
      const subName = sub.name;
      this.frameworkLoading = true;
      try {
        const prompt = this.buildFrameworkPrompt(framework, taskName, subName);
        const resp = await this.safeFetch('/api/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 前端可选提供 API Key；服务端也会使用环境变量兜底
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || localStorage.getItem('API_KEY') || ''}`
          },
          body: JSON.stringify({ model: 'deepseek-v3', messages: [{ role:'user', content: prompt }], max_tokens: 1600 })
        });
        let text = '';
        if (resp.ok) {
          const data = await resp.json();
          text = data?.choices?.[0]?.message?.content?.trim() || '';
        } else {
          const m = await resp.text().catch(()=> '');
          text = `AI响应错误: ${resp.status} ${m.slice(0,200)}`;
        }
        if (!text) throw new Error('AI未返回内容');
        // 写入缓存
        this.contentCache[this.activePlanTaskId] = {
          ...(this.contentCache[this.activePlanTaskId] || {}),
          [framework]: text
        };
        // 若生成的是当前选中的框架，更新展示
        if (framework === this.selectedFramework) {
          this.editablePlanContent = text;
        }
        const note = framework === 'trend' ? '主演化(趋势分析)'
                  : framework === 'system' ? '主系统(九宫格+因果)'
                  : '主作用(FOP分析)';
        await this.saveCurrentPlanContent(note);
      } catch (e) {
        if (!silent) console.warn('生成框架内容失败:', e);
        // 本地兜底模板
        const tpl = this.buildFrameworkSkeleton(framework, taskName, subName);
        this.contentCache[this.activePlanTaskId] = {
          ...(this.contentCache[this.activePlanTaskId] || {}),
          [framework]: tpl
        };
        if (framework === this.selectedFramework) {
          this.editablePlanContent = tpl;
        }
      } finally {
        this.frameworkLoading = false;
      }
    },
    // 组装框架 Prompt
    buildFrameworkPrompt(framework, taskName, subTaskName) {
      const base = `主任务：${taskName}\n子任务：${subTaskName}\n`;
      if (framework === 'trend') {
        return base + `请进行“主演化（趋势分析）”。输出要求：\n- 技术/市场/法规/数据 等趋势要点（条目）\n- 演进路径与时间轴（阶段->关键里程碑）\n- 能力S曲线/成熟度评估（若合适）\n- 对子任务的影响与机会/风险\n- 建议行动清单\n以 Markdown 编写，使用小标题与清单。`;
      } else if (framework === 'system') {
        return base + `请进行“主系统（九宫格+因果分析）”。输出要求：\n- 九宫格：目标/场景/角色/资源/约束/流程/数据/指标/风险（用表格填写）\n- 因果链分析：关键因->果关系、环路与可能的杠杆点\n- 对应的干预措施与监测点\n以 Markdown 表格与列表呈现。`;
      } else {
        return base + `请进行“主作用（FOP分析）”。FOP=功能(Function)-对象(Object)-原理(Principle)。输出要求：\n- 功能列表（主/次要功能）\n- 每个功能的对象与作用机理/物理原理\n- 可替代原理与实现路径（优缺点对比）\n- 聚焦本子任务的推荐原理与理由\n以 Markdown 小节与表格呈现。`;
      }
    },
    // 本地骨架模板（AI 失败时）
    buildFrameworkSkeleton(framework, taskName, subTaskName) {
      if (framework === 'trend') {
        return `## ${subTaskName} · 主演化（趋势分析）\n\n### 关键趋势\n- 技术：\n- 市场：\n- 法规：\n- 数据：\n\n### 演进路径与时间轴\n- 阶段1：目标/里程碑\n- 阶段2：目标/里程碑\n\n### 影响与机会/风险\n- 机会：\n- 风险：\n\n### 建议行动\n- [ ] 行动A\n- [ ] 行动B`;
      } else if (framework === 'system') {
        return `## ${subTaskName} · 主系统（九宫格+因果）\n\n### 九宫格\n| 目标 | 场景 | 角色 |\n|---|---|---|\n|  |  |  |\n\n| 资源 | 约束 | 流程 |\n|---|---|---|\n|  |  |  |\n\n| 数据 | 指标 | 风险 |\n|---|---|---|\n|  |  |  |\n\n### 因果分析\n- 因1 -> 果1\n- 因2 -> 果2\n\n### 干预措施\n- 措施A：\n- 措施B：`;
      } else {
        return `## ${subTaskName} · 主作用（FOP分析）\n\n### 功能列表\n- 主功能：\n- 次要功能：\n\n### FOP 映射\n| 功能 | 对象 | 原理/机理 | 备选原理 |\n|---|---|---|---|\n|  |  |  |  |\n\n### 推荐原理与理由\n- 推荐：\n- 理由：`;
      }
    },
    /**
     * 确保子任务存在：优先从后端加载；若为空则调用 AI 拆解并保存
     */
    async ensureSubTasks() {
      const taskName = this.getCurrentTaskName();
      if (!taskName) return;
      try {
        // 先尝试读取已保存的子任务
        const resp = await this.safeFetch(`/api/sub-tasks/${encodeURIComponent(taskName)}`);
        if (resp.ok) {
          const data = await resp.json();
          const list = Array.isArray(data?.subTasks) ? data.subTasks : [];
          if (list.length > 0) {
            this.subTasksRaw = list.map((r) => ({ name: r.sub_task_name, description: r.description, difficulty: r.difficulty || 'medium' }));
            // 若当前 planTasks 是 Template 三大框架占位，则仅保留 subTasksRaw，不覆盖 planTasks 的展示；
            // 否则使用真实子任务替换 planTasks。
            if (!this.isFrameworkPlanList(this.planTasks)) {
              this.planTasks = this.mapSubTasksToPlan(this.subTasksRaw);
              this.activePlanTaskId = this.planTasks[0]?.id || null;
            }
            // 背景批量生成三框架（仅对真实子任务触发）
            if (!this.batchFrameworkEnsured && !this.isFrameworkPlanList(this.planTasks)) {
              this.batchFrameworkEnsured = true;
              setTimeout(() => { this.generateFrameworksForAllSubTasks().catch(()=>{}); }, 0);
            }
            return;
          }
        }
      } catch (_) {}
      // 无数据则调用 AI 拆解
      await this.decomposeSubTasks();
    },
    /**
     * 调用 AI 拆解子任务并保存
     */
    async decomposeSubTasks() {
      const taskName = this.getCurrentTaskName();
      if (!taskName) return;
      this.isDecomposing = true;
      try {
        const body = {
          taskName,
          templateData: {
            area: this.taskDetails?.area || '',
            audience: this.taskDetails?.audience || '',
            prompt: this.taskDetails?.prompt || ''
          }
        };
        const resp = await this.safeFetch('/api/ai/decompose-subtasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || localStorage.getItem('API_KEY') || ''}`
          },
          body: JSON.stringify(body)
        });
        if (!resp.ok) throw new Error(`decompose-subtasks 接口失败: ${resp.status}`);
        const data = await resp.json();
        const subs = Array.isArray(data?.subTasks) ? data.subTasks : [];
        if (subs.length === 0) throw new Error('AI 未返回子任务');
        this.subTasksRaw = subs.map(s => ({ name: s.name, description: s.description, difficulty: s.difficulty || 'medium' }));
        if (!this.isFrameworkPlanList(this.planTasks)) {
          this.planTasks = this.mapSubTasksToPlan(this.subTasksRaw);
          this.activePlanTaskId = this.planTasks[0]?.id || null;
        }
        // 持久化子任务
        await this.saveSubTasksBatch(taskName);
      } catch (e) {
        console.error('拆解子任务失败:', e);
        // 本地兜底：根据模板信息粗略生成 3 个子任务，避免流程卡死
        try {
          const base = String(this.taskDetails?.prompt || this.taskDetails?.area || taskName || '任务').trim();
          const words = (String(this.taskDetails?.keywords || '').split(/[，,;；\s]/).filter(Boolean).slice(0,3));
          const names = [
            `${base} - 需求梳理`,
            `${base} - 方案设计`,
            `${base} - 风险评估`
          ].slice(0, Math.max(1, Math.min(3, words.length || 3)));
          this.subTasksRaw = names.map((n, i) => ({ name: n, description: words[i] ? `聚焦关键词：${words[i]}` : '—', difficulty: 'medium' }));
          if (!this.isFrameworkPlanList(this.planTasks)) {
            this.planTasks = this.mapSubTasksToPlan(this.subTasksRaw);
            this.activePlanTaskId = this.planTasks[0]?.id || null;
          }
          await this.saveSubTasksBatch(taskName);
        } catch (_) {}
      } finally {
        this.isDecomposing = false;
      }
    },
    /**
     * 子任务转换为页面展示的 planTasks（用于复用现有渲染区域）
     */
    mapSubTasksToPlan(list) {
      const diffText = (d) => d === 'easy' ? '⭐ 简单' : (d === 'hard' ? '⭐⭐⭐ 困难' : '⭐⭐ 中等');
      return (list || []).map((t, idx) => ({
        id: idx + 1,
        name: t.name,
        content: `### ${t.name}\n\n**难度**：${diffText(t.difficulty)}\n\n**描述**：${t.description || '—'}`
      }));
    },
    /**
     * 保存子任务（幂等：先清空再写入）
     */
    async saveSubTasksBatch(taskName) {
      const payload = (this.subTasksRaw || []).map(s => ({ name: s.name, description: s.description, difficulty: s.difficulty || 'medium' }));
      if (!payload.length) return;
      const resp = await this.safeFetch('/api/sub-tasks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName, subTasks: payload })
      });
      if (!resp.ok) throw new Error(`保存子任务失败: ${resp.status}`);
    },
    /**
     * AI 分析所有子任务的问题并跳转
     */
    async analyzeAndContinue(taskName) {
      try {
        this.isAnalyzing = true;
        const subList = (this.subTasksRaw || []).map(s => ({ name: s.name, description: s.description || '' }));
        if (!subList.length) throw new Error('无子任务可分析');
        // 调用 AI 分析
        const resp = await this.safeFetch('/api/ai/analyze-task-problems', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || localStorage.getItem('API_KEY') || ''}`
          },
          body: JSON.stringify({ taskName, subTasks: subList })
        });
        if (!resp.ok) throw new Error(`分析问题失败: ${resp.status}`);
        const data = await resp.json();
        // 持久化问题清单
        const resp2 = await this.safeFetch('/api/task-problems/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskName, problems: data?.problems || [] })
        });
        if (!resp2.ok) throw new Error(`保存问题清单失败: ${resp2.status}`);
        // 跳转到集成分析页（向后兼容：携带 issues 兜底）
        const issues = this.buildIssuesFromPlan();
        const payload = (issues.length ? issues : ['已触发后端分析，稍等加载结果']).join('\n');
        this.$router.push({ name: 'NewIntegration', query: { taskName, fromTaskManager: 'true', issues: payload } });
      } finally {
        this.isAnalyzing = false;
      }
    },
    // 选择子任务（来自 plan）
    selectPlanTask(task) {
      this.activePlanTaskId = task.id;
      this.selectedTask = task.name;
      // 每次切换子任务默认回到“主演化”并尝试加载/生成
      this.selectedFramework = 'trend';
      this.ensureAllFrameworkContents();
    },
    addTask() {
      // 必须先选中一个父任务
      if (!this.selectedParentTask) {
        console.log('请先选择一个父任务');
        return;
      }
      
      // 获取当前父任务的子任务列表
      const currentSubTasks = this.subTasksMap[this.selectedParentTask] || [];
      
      // 限制每个父任务最多添加9个子任务
      if (currentSubTasks.length >= 9) {
        console.log(`${this.selectedParentTask} 已达到最大子任务数量限制（9个）`);
        return;
      }
      
      // 提取父任务编号
      const parentMatch = this.selectedParentTask.match(/任务(\d+)/);
      if (!parentMatch) {
        console.log('无效的父任务格式');
        return;
      }
      
      const parentNumber = parseInt(parentMatch[1]);
      // 计算新子任务编号：父任务编号 + (当前子任务数量 + 1) * 0.1
      const newTaskNumber = parentNumber + (currentSubTasks.length + 1) * 0.1;
      const newTaskName = `任务${newTaskNumber.toFixed(1)}`;
      
      // 添加到对应父任务的子任务列表
      if (!this.subTasksMap[this.selectedParentTask]) {
        this.subTasksMap[this.selectedParentTask] = [];
      }
      this.subTasksMap[this.selectedParentTask].push(newTaskName);
      
      // 统计当前已添加的任务数（右侧显示用）
      const nextId = `taskid${this.addedTasks.length + 1}`;
      this.addedTasks.push(nextId);
      this.selectedTask = nextId;
      
      console.log(`为 ${this.selectedParentTask} 添加子任务: ${newTaskName}`);
      // 更新数据库
      this.updateDatabase();
    },
    async selectParentTask(taskName) {
      this.selectedParentTask = taskName;
      this.selectedTask = taskName;
      console.log(`选中父任务: ${taskName}`);
      
      // 如果该父任务还没有子任务列表，初始化一个空数组
      if (!this.subTasksMap[taskName]) {
        this.subTasksMap[taskName] = [];
      }
      
      // 切换任务时，重新加载该任务对应的AI回复和相关数据
      this.currentTaskName = taskName;
      await this.loadTaskData(taskName);
    },
    selectDynamicTask(taskName) {
      this.selectedTask = taskName;
      console.log(`选中子任务: ${taskName}`);
    },
    getSubTasks(parentTask) {
      // 若有任务规划，优先显示规划的三个子任务
      if (this.planTasks?.length && parentTask === this.selectedParentTask) {
        return this.planTasks.map(t => t.name);
      }
      return this.subTasksMap[parentTask] || [];
    },
    deleteParentTask(taskName) {
      // 从recentTasks中删除
      const index = this.recentTasks.indexOf(taskName);
      if (index > -1) {
        this.recentTasks.splice(index, 1);
        this.totalTaskCount--;
      }
      
      // 删除对应的子任务映射
      delete this.subTasksMap[taskName];
      
      // 如果删除的是当前选中的父任务，清空选中状态
      if (this.selectedParentTask === taskName) {
        this.selectedParentTask = null;
        this.selectedTask = null;
      }
      
      console.log(`删除父任务: ${taskName}`);
      
      // 更新localStorage中的任务列表
      this.updateDialogTasks();
      
      // 更新数据库
      this.updateDatabase();
    },
    deleteSubTask(parentTask, subTaskName) {
      if (this.subTasksMap[parentTask]) {
        const index = this.subTasksMap[parentTask].indexOf(subTaskName);
        if (index > -1) {
          this.subTasksMap[parentTask].splice(index, 1);
        }
      }
      
      // 如果删除的是当前选中的任务，清空选中状态
      if (this.selectedTask === subTaskName) {
        this.selectedTask = null;
      }
      
      console.log(`删除子任务: ${subTaskName}`);
      
      // 更新数据库
      this.updateDatabase();
    },
    updateDialogTasks() {
      // 更新localStorage中的dialogTasks
      try {
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        // 根据recentTasks更新dialogTasks
        const updatedTasks = dialogTasks.filter(task => this.recentTasks.includes(task));
        localStorage.setItem('dialogTasks', JSON.stringify(updatedTasks));
      } catch (error) {
        console.error('更新Dialog任务列表失败:', error);
      }
    },
    hoverTask(taskType) {
      if (this.$refs[taskType]) {
        this.$refs[taskType].style.backgroundColor = '#e0ffe0';
      }
    },
    leaveTask(taskType) {
      if (this.$refs[taskType]) {
        this.$refs[taskType].style.backgroundColor = '';
      }
    },
    selectTask(taskType) {
      this.selectedTask = taskType;
    },
    toggleTaskList() {
      this.taskListCollapsed = !this.taskListCollapsed;
    },
    handleTaskClick(taskId) {
      this.selectedTask = taskId;
      if (taskId === 'taskid1') {
        this.currentTime = new Date().toLocaleString();
      }
    },
    toggleTasksPanel() {
      this.tasksPanelExpanded = !this.tasksPanelExpanded;
    },
    toggleAiPanel() {
      this.aiPanelExpanded = !this.aiPanelExpanded;
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
        
        // 如果有任务，设置基础任务编号为最新任务的编号
        if (dialogTasks.length > 0) {
          // 提取最新任务的编号，假设格式为"任务X"
          const latestTask = dialogTasks[dialogTasks.length - 1];
          const match = latestTask.match(/任务(\d+)/);
          if (match) {
            this.baseTaskNumber = parseInt(match[1]);
          }
        }
      } catch (error) {
        console.error('加载任务数据失败:', error);
        this.totalTaskCount = 0;
        this.recentTasks = [];
        this.baseTaskNumber = 1;
      }
    },
    
    /**
     * 获取当前任务名称（基于用户选择）
     */
    getCurrentTaskName() {
      // 优先返回用户当前选择的任务
      if (this.selectedParentTask) {
        return this.selectedParentTask;
      }
      
      // 其次从路由参数获取
      if (this.$route.query.currentTask) {
        return this.$route.query.currentTask;
      }
      
      // 如果没有选择任务，尝试从localStorage获取
      try {
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        const currentTask = localStorage.getItem('currentDialogTask');
        
        if (currentTask && dialogTasks.includes(currentTask)) {
          return currentTask;
        } else if (dialogTasks.length > 0) {
          return dialogTasks[dialogTasks.length - 1];
        } else {
          return 'TaskManager任务';
        }
      } catch (error) {
        console.error('获取任务名称失败:', error);
        return 'TaskManager任务';
      }
    },
    
    /**
     * 生成任务的Markdown内容
     */
    generateTaskMarkdown(taskId, index) {
      const status = index === 0 ? '进行中' : '待处理';
      const userId = '张三'; // 可以从用户状态中获取
      const taskNumber = index + 1;
      
      return `**Status:** ${status}  
        **Userid:** ${userId}  
        **Taskid:** 任务${taskNumber}  
        **startTime:** ${this.currentTime}  
        **taskContent:** ${this.taskDetails.area || '暂无内容'}`;
            },
    
    /**
     * 保存到数据库
     */
  async saveToDatabase() {
      try {
        // 获取当前真正的任务名称
        const realTaskName = this.getCurrentTaskName();
        
        console.log('TaskManager保存到数据库 - 任务名称:', realTaskName);
        
        const response = await fetch('/api/save-task-manager', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            addedTasks: this.addedTasks,
            taskDetails: this.taskDetails,
            taskName: realTaskName
          })
        });

        if (response.ok) {
          const result = await response.json();
          this.taskManagerId = result.id;
          this.currentTaskName = realTaskName; // 更新当前任务名称
          console.log('TaskManager内容已保存到数据库，ID:', this.taskManagerId, '任务名称:', realTaskName);
        } else {
          console.error('保存到数据库失败:', response.status);
        }
      } catch (error) {
        console.error('数据库保存操作失败:', error);
      }
    },
    
    /**
     * 更新数据库
     */
  async updateDatabase() {
      if (!this.taskManagerId) {
        // 如果没有ID，则创建新记录
        await this.saveToDatabase();
        return;
      }
      
      try {
        // 获取当前真正的任务名称
        const realTaskName = this.getCurrentTaskName();
        
        console.log('TaskManager更新数据库 - 任务名称:', realTaskName);
        
        const response = await fetch(`/api/update-task-manager/${this.taskManagerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            addedTasks: this.addedTasks,
            taskDetails: this.taskDetails,
            taskName: realTaskName
          })
        });

        if (response.ok) {
          this.currentTaskName = realTaskName; // 更新当前任务名称
          console.log('TaskManager内容已更新到数据库，任务名称:', realTaskName);
        } else {
          console.error('更新数据库失败:', response.status);
        }
      } catch (error) {
        console.error('数据库更新操作失败:', error);
      }
    },
    
    /**
     * 加载特定任务的数据（AI回复、任务详情等）
     */
    async loadTaskData(taskName) {
      try {
        console.log(`加载任务数据: ${taskName}`);
        
        const response = await fetch(`/api/task-manager-content/${encodeURIComponent(taskName)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.taskManagerContents && data.taskManagerContents.length > 0) {
            // 取最新的记录（按创建时间降序排列）
            const tm = data.taskManagerContents[0];
            
            // 恢复已添加的任务
            if (tm.added_tasks) {
              this.addedTasks = tm.added_tasks;
            }
            
            // 恢复任务详情
            if (tm.task_details) {
              this.taskDetails = tm.task_details;
            }
            
            // 保存数据库记录ID
            this.taskManagerId = tm.id;
            
            console.log(`成功加载任务 ${taskName} 的数据`);
          } else {
            console.log(`数据库中没有找到任务 ${taskName} 的记录`);
          }
        } else {
          console.log(`从数据库加载任务 ${taskName} 失败:`, response.status);
        }
      } catch (error) {
        console.error(`加载任务 ${taskName} 数据失败:`, error);
      }
    },
    
    /**
     * 从数据库加载TaskManager状态（已废弃，使用 loadTaskData 替代）
     */
    async loadFromDatabase() {
      // 获取当前任务名称
      const taskName = this.getCurrentTaskName();
      this.currentTaskName = taskName;
      
      if (!taskName) {
        console.log('没有当前任务名称，跳过数据库加载');
        return;
      }
      
      // 使用新的loadTaskData方法
      await this.loadTaskData(taskName);
    }
  },
  watch: {
    activePlanTaskId() {
      this.editablePlanContent = this.currentPlanContent;
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
  font-family: 'Segoe UI', 'Arial', sans-serif;
}

/* 主要内容区域布局 */
.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* 左侧边栏样式 - 与Template.vue保持一致 */
.sidebar {
  width: 250px;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 20px;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width var(--transition-medium) ease;
}

.sidebar.collapsed {
  width: 48px;
  padding: 24px 4px;
}

.task-list {
  flex: 0 0 auto;
}

.toggle-icon {
  position: absolute;
  top: 16px;
  left: 12px;
  cursor: pointer;
  font-size: 1.6em;
  color: #3498db;
  transition: color var(--transition-medium) ease;
  z-index: 10;
}

.toggle-icon:hover {
  color: #e74c3c;
}

.task-list h2 {
  margin: 24px 0 20px 0;
  font-size: 1.3em;
  text-align: center;
  color: #ecf0f1;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 12px;
  font-weight: 600;
  letter-spacing: 1px;
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
  max-height: 300px;
}

.task-item {
  padding: 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  border-left: 4px solid #3498db;
  transition: all var(--transition-fast);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.task-item:hover {
  background: rgba(255, 255, 255, 0.25);
  border-left-color: #2980b9;
  transform: translateX(2px);
}

.task-item.active {
  background: rgba(52, 152, 219, 0.3);
  border-left-color: #2980b9;
  color: #fff;
  font-weight: 700;
}

.task-item .delete-icon {
  color: #e74c3c;
  cursor: pointer;
  font-size: 1.1em;
  transition: color 0.2s;
  padding: 4px;
  border-radius: 3px;
  opacity: 0.7;
}

.task-item .delete-icon:hover {
  color: #c0392b;
  background: rgba(255, 255, 255, 0.2);
  opacity: 1;
}

.task-name {
  font-size: 0.95em;
  display: block;
  word-wrap: break-word;
  line-height: 1.4;
  color: #ecf0f1;
  font-weight: 500;
}

/* 一级标题样式（父任务行） */
.parent-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.task-name.h1 {
  font-size: 1.05em;
  font-weight: 700;
}
.expand-icon {
  color: #f39c12;
}

/* 二级标题样式（子任务按钮） */
.dynamic-task-button.h2 {
  font-size: 0.92em;
  padding-left: 16px;
}
.subtasks-list {
  width: 100%;
  margin-top: 10px;
}

.dynamic-tasks {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-task-header {
  font-size: 0.9em;
  color: #bdc3c7;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  text-align: center;
  font-weight: 600;
}

.dynamic-task-button {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.15);
  color: #ecf0f1;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-left: 4px solid #3498db;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dynamic-task-button:hover {
  background: rgba(255, 255, 255, 0.25);
  border-left-color: #2980b9;
  transform: translateX(2px);
}

.dynamic-task-button.active {
  background: rgba(52, 152, 219, 0.3);
  border-left-color: #2980b9;
  color: #fff;
  font-weight: 700;
}

.dynamic-task-button .task-text {
  flex: 1;
  text-align: left;
}

.dynamic-task-button .delete-icon {
  color: #e74c3c;
  cursor: pointer;
  font-size: 1.0em;
  transition: color 0.2s;
  padding: 2px 4px;
  border-radius: 3px;
  opacity: 0.7;
}

.dynamic-task-button .delete-icon:hover {
  color: #c0392b;
  background: rgba(255, 255, 255, 0.2);
  opacity: 1;
}

.task-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-details button {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.15);
  color: #ecf0f1;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 1.08em;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-left: 4px solid #3498db;
}

.task-details button:hover {
  background: rgba(255, 255, 255, 0.25);
  border-left-color: #2980b9;
  transform: translateX(2px);
}

.task-details button.active {
  background: rgba(231, 76, 60, 0.3);
  border-left-color: #e74c3c;
  color: #fff;
  font-weight: 700;
}

.left-bottom-add {
  margin-top: auto;
  padding-top: 16px;
}

.left-bottom-add button {
  width: 100%;
  background: var(--success-gradient);
  color: #fff;
  border: none;
  border-radius: var(--border-radius);
  padding: 12px 0;
  font-size: 1.08em;
  font-weight: 700;
  cursor: pointer;
  transition: background var(--transition-medium), transform var(--transition-fast);
  box-shadow: var(--shadow-light);
}

.left-bottom-add button:hover {
  background: linear-gradient(90deg, #218838 0%, #43d477 100%);
  transform: scale(1.04);
}

/* 主内容容器 - 与Template.vue保持一致 */
.template-container {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  background: transparent;
  overflow-y: auto;
  min-height: 0;
  position: relative;
}

/* AI回复板块样式 */
.ai-response {
  width: 90%;
  max-width: 820px;
  margin-bottom: 28px;
  padding: 32px 28px 24px 28px;
  border: 1.5px solid #d1d5db;
  border-radius: var(--border-radius-large);
  background: #fff;
  cursor: default;
  box-shadow: var(--shadow-light);
  transition: box-shadow var(--transition-medium), background var(--transition-medium);
  flex-shrink: 0;
}

.ai-response:hover {
  box-shadow: var(--shadow-medium);
  background: #f0f4ff;
}

.ai-response h2 {
  margin: 0 0 18px 0;
  font-size: 1.22em;
  color: var(--primary-color);
  font-weight: 700;
  text-align: center;
  letter-spacing: 1px;
}

.ai-content {
  max-height: none !important;
  overflow: visible !important;
  height: auto !important;
}

.ai-text {
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.6;
  font-size: 1.05em;
  color: #444;
  max-height: none;
  overflow: visible;
}

/* Markdown 内容样式 */
.ai-text :deep(p) {
  margin: 8px 0;
  white-space: normal;
  word-wrap: break-word;
}

.ai-text :deep(pre) {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: var(--border-radius);
  overflow-x: auto;
}

.ai-text :deep(ul),
.ai-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.ai-text :deep(li) {
  margin: 4px 0;
}

.ai-text :deep(h1),
.ai-text :deep(h2),
.ai-text :deep(h3),
.ai-text :deep(h4),
.ai-text :deep(h5),
.ai-text :deep(h6) {
  margin: 16px 0 8px 0;
  color: var(--primary-color);
}

.ai-text :deep(strong) {
  font-weight: bold;
  color: var(--primary-color);
}

.ai-text :deep(em) {
  font-style: italic;
}

.ai-text :deep(code) {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.ai-text :deep(blockquote) {
  border-left: 4px solid var(--accent-color);
  padding-left: 12px;
  margin: 16px 0;
  color: #666;
}

.ai-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.ai-text :deep(th),
.ai-text :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.ai-text :deep(th) {
  background-color: #f5f5f5;
  font-weight: bold;
}

/* 框架切换区域 */
.framework-tabs {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.framework-tabs .tab-btn {
  padding: 6px 10px;
  font-size: 0.92em;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
}
.framework-tabs .tab-btn.active {
  background: #eaf4ff;
  border-color: #5a8cff;
  color: #2d3a4b;
  font-weight: 700;
}
.framework-tabs .gen-btn {
  margin-left: auto;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #28a745;
  color: #fff;
  cursor: pointer;
}
.framework-tabs .tab-spacer { flex: 1; }

/* 任务板块样式 */
.tasks {
  width: 90%;
  max-width: 820px;
  margin-bottom: 24px;
  padding: 32px 28px 24px 28px;
  border: 1.5px solid #d1d5db;
  border-radius: var(--border-radius-large);
  background: #fff;
  transition: background-color var(--transition-medium), box-shadow var(--transition-medium);
  box-shadow: var(--shadow-light);
  cursor: default;
}

.tasks:hover {
  background-color: #e0ffe0;
  box-shadow: var(--shadow-medium);
}

.tasks h2 {
  color: var(--primary-color);
  margin: 0 0 18px 0;
  font-size: 1.22em;
  font-weight: 700;
  text-align: center;
  letter-spacing: 1px;
}

.tasks ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.tasks li {
  margin-bottom: 12px;
  font-size: 1.05em;
  color: #333;
  line-height: 1.6;
}

/* 底部按钮样式 - 放在右侧底部 */
.right-footer {
  width: 90%;
  max-width: 820px;
  padding: 24px 0 0 0;
  background: transparent;
  text-align: center;
  margin-top: auto;
}

.continue-button {
  background: #28a745; /* 浅绿色常量 */
  color: white;
  padding: 14px 0;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  width: 100%;
  font-size: 1.22em;
  font-weight: 700;
  transition: background var(--transition-medium), transform var(--transition-fast);
  box-shadow: var(--shadow-light);
}

.continue-button:hover {
  background: #1e7e34; /* 深绿色 */
  transform: scale(1.03);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  background: #e0e7ff;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #bfcfff;
  border-radius: 4px;
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
  
  .template-container {
    padding: 20px;
  }
  
  .ai-response,
  .tasks {
    width: 100%;
    padding: 20px;
  }
  
  .right-footer {
    width: 100%;
    padding: 20px 0 0 0;
  }
}

/* 兼容折叠状态的样式 */
.sidebar.collapsed .task-list h2,
.sidebar.collapsed .task-counter,
.sidebar.collapsed .task-history,
.sidebar.collapsed .dynamic-tasks,
.sidebar.collapsed .task-details,
.sidebar.collapsed .left-bottom-add button {
  display: none;
}

.sidebar.collapsed .toggle-icon {
  left: 16px;
}
</style>