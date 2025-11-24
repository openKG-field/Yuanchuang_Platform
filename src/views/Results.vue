<template>
  <div class="ai-agent-page">
    <!-- 顶部标题栏 -->
    <header class="header">
      <div class="logo-placeholder">技术方案库</div>
    </header>

    <div class="page-body">
      <!-- 左侧边栏：仅显示“任务几” -->
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

      <!-- 主区 -->
      <main class="content">
        <!-- 任务记录顶栏 -->
        <div class="task-record-bar">
          <span>任务记录：{{ currentTaskName }}</span>
          <button class="refresh-btn" @click="refresh" :disabled="isLoading">{{ isLoading ? '加载中…' : '刷新' }}</button>
        </div>

        <!-- 文章预览 -->
        <div class="articles">
          <div v-if="errorMessage" class="error-box">
            <span>{{ errorMessage }}</span>
          </div>
          <div v-else-if="isLoading" class="loading-box">加载中，请稍候…</div>
          <!-- 已移除单一初步综合方案展示，直接显示两个在 NewIntegration 已生成的目标解决方案 -->
          <div class="article-row">
            <!-- 左侧文章 -->
            <div class="article">
              <span class="date">{{ articles[0].date }}</span>
              <div class="article-title-row">
                <h4 class="article-title">{{ articles[0].title }}</h4>
                <button class="regen-btn" :disabled="loading[0]" @click="regenerateSolution(0)">
                  {{ loading[0] ? '重新生成中...' : '重新思考' }}
                </button>
              </div>
              <!-- Markdown 预览 -->
              <div class="md-preview">
                <vue-markdown-it :source="articles[0].content || ''" />
              </div>
            </div>
            
            <!-- 右侧文章 -->
            <div class="article">
              <span class="date">{{ articles[1].date }}</span>
              <div class="article-title-row">
                <h4 class="article-title">{{ articles[1].title }}</h4>
                <button class="regen-btn" :disabled="loading[1]" @click="regenerateSolution(1)">
                  {{ loading[1] ? '重新生成中...' : '重新思考' }}
                </button>
              </div>
              <!-- Markdown 预览 -->
              <div class="md-preview">
                <vue-markdown-it :source="articles[1].content || ''" />
              </div>
            </div>
          </div>
        </div>

        <!-- 添加到我的收藏按钮 -->
        <div class="add-to-favorites">
          <button @click="goToTemplateSelection">下一步</button>
        </div>
      </main>
    </div>
  </div>
  
</template>

<script>
import VueMarkdownIt from 'vue3-markdown-it';
import { ElIcon } from 'element-plus';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
export default {
  name: "Results",
  components: {
    VueMarkdownIt,
    ElIcon,
    'el-icon-arrow-left': ArrowLeft,
    'el-icon-arrow-right': ArrowRight
  },
  data() {
    return {
      articles: [
        { selected: false, date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }), title: "目标解决方案一", content: "" },
        { selected: false, date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }), title: "目标解决方案二", content: "" },
      ],
      API_URL: '/api/ai', // 修改为正确的AI接口地址
      loading: [false, false],
      analysisId: null, // 来自NewIntegration的分析记录ID
      currentTaskName: '', // 当前任务名称
      selectedIssues: '', // 用户选择的问题
      taskIndex: -1, // 在历史任务中的序号（从0开始）
  sidebarCollapsed: false,
  integrationLoaded: false,
  // 新增：加载与错误状态
  isLoading: false,
  errorMessage: ''
    };
  },
  computed: {
    displayedTaskNumber() {
      return this.taskIndex >= 0 ? this.taskIndex + 1 : '-';
    }
  },
  async created() {
    // 获取上下游传参：优先使用更语义化 selectedIssues，其次兼容旧 issues
    const issuesParam = this.$route.query.selectedIssues || this.$route.query.issues || "";
    this.analysisId = this.$route.query.analysisId || null;
    this.selectedIssues = issuesParam;
    // 获取当前任务名称
    this.getCurrentTaskName();
    // 后端优先加载
    await this.refresh();
    this.loading = [false,false];
  },
  methods: {
    // 统一 fetch，Vite 代理失败时回退直连后端
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
    async refresh() {
      this.isLoading = true;
      this.errorMessage = '';
      try {
        // 先按 analysisId 精确获取
        let ok = false;
        if (this.analysisId) {
          ok = await this.tryLoadByAnalysisId(this.analysisId);
        }
        // 其次按 taskName 获取最近一条并匹配 analysisId
        if (!ok) ok = await this.tryLoadByTaskName();
        // 失败则回退本地缓存
        if (!ok) ok = await this.loadFromLocalCache();
        if (!ok) {
          this.errorMessage = '未找到结果数据，请返回集成分析重新生成。';
        } else {
          // 成功后写入本地缓存
          this.cacheResultsToLocal();
        }
      } catch (e) {
        this.errorMessage = '加载失败：' + (e?.message || e);
      } finally {
        this.isLoading = false;
      }
    },
    // 后端复用：按 taskName 获取最近一条 Results（与 analysisId 匹配优先）
    async tryLoadFromBackend() {
      try {
        if (!this.currentTaskName) return false;
        const res = await this.safeFetch(`/api/results-solutions/${encodeURIComponent(this.currentTaskName)}`);
        if (!res.ok) return false;
        const data = await res.json();
        const list = data?.solutions || [];
        if (!Array.isArray(list) || list.length === 0) return false;
        // 若有 analysisId，优先匹配
        let rec = null;
        if (this.analysisId) {
          rec = list.find(r => String(r.analysis_id) === String(this.analysisId));
        }
        if (!rec) rec = list[0];
        if (!rec) return false;
        this.selectedIssues = rec.selected_issues || this.selectedIssues;
        this.articles[0].title = rec.solution1_title || this.articles[0].title;
        this.articles[0].content = rec.solution1_content || '';
        this.articles[1].title = rec.solution2_title || this.articles[1].title;
        this.articles[1].content = rec.solution2_content || '';
        return !!(this.articles[0].content && this.articles[1].content);
      } catch (_) { return false; }
    },
    // 新增：按 analysisId 获取记录
    async tryLoadByAnalysisId(id) {
      try {
        // 优先通过 taskName 拉取列表并按 analysis_id 匹配，避免 /id/:id 404 的噪声
        if (this.currentTaskName) {
          const listRes = await this.safeFetch(`/api/results-solutions/${encodeURIComponent(this.currentTaskName)}`);
          if (listRes.ok) {
            const listData = await listRes.json();
            const list = Array.isArray(listData?.solutions) ? listData.solutions : [];
            const rec = list.find(r => String(r.analysis_id) === String(id));
            if (rec) {
              this.selectedIssues = rec.selected_issues || this.selectedIssues;
              this.articles[0].title = rec.solution1_title || this.articles[0].title;
              this.articles[0].content = rec.solution1_content || '';
              this.articles[1].title = rec.solution2_title || this.articles[1].title;
              this.articles[1].content = rec.solution2_content || '';
              return !!(this.articles[0].content && this.articles[1].content);
            }
          }
        }
        // 回退：直查按ID（若后端实现的是主键ID获取）
        const res = await this.safeFetch(`/api/results-solutions/id/${encodeURIComponent(id)}`);
        if (!res.ok) return false;
        const data = await res.json();
        const rec = data?.solution;
        if (!rec) return false;
        if (!this.currentTaskName && rec.task_name) this.currentTaskName = rec.task_name;
        this.selectedIssues = rec.selected_issues || this.selectedIssues;
        this.articles[0].title = rec.solution1_title || this.articles[0].title;
        this.articles[0].content = rec.solution1_content || '';
        this.articles[1].title = rec.solution2_title || this.articles[1].title;
        this.articles[1].content = rec.solution2_content || '';
        return !!(this.articles[0].content && this.articles[1].content);
      } catch (_) { return false; }
    },
    // 新增：封装旧逻辑
    async tryLoadByTaskName() {
      return this.tryLoadFromBackend();
    },
    // 读取本地缓存（NewIntegration 写入的本地结果）
    async loadFromLocalCache() {
      try {
        const key = `results:payload:${this.currentTaskName}`;
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        const obj = JSON.parse(raw);
        if (!obj || !Array.isArray(obj.articles)) return false;
        this.selectedIssues = obj.selectedIssues || this.selectedIssues;
        // 将本地两篇文章灌入
        if (obj.articles[0]) {
          this.articles[0].title = obj.articles[0].title || this.articles[0].title;
          this.articles[0].content = obj.articles[0].content || '';
        }
        if (obj.articles[1]) {
          this.articles[1].title = obj.articles[1].title || this.articles[1].title;
          this.articles[1].content = obj.articles[1].content || '';
        }
        return !!(this.articles[0].content && this.articles[1].content);
      } catch (_) { return false; }
    },
    // 将当前结果写入本地缓存，便于断线/刷新保留
    cacheResultsToLocal() {
      try {
        localStorage.setItem(`results:payload:${this.currentTaskName}` , JSON.stringify({
          taskName: this.currentTaskName,
          analysisId: this.analysisId,
          selectedIssues: this.selectedIssues,
          articles: this.articles,
          when: Date.now()
        }));
      } catch(_) {}
    },
  // 移除本地缓存逻辑
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
    /**
     * 获取当前任务名称
     */
    getCurrentTaskName() {
      try {
        // 路由优先（NewIntegration 会传）
        const routeTask = this.$route.query.taskName;
        if (routeTask) {
          this.currentTaskName = routeTask;
          // 同时更新本地当前任务
          try { localStorage.setItem('currentDialogTask', routeTask); } catch(_) {}
          // 尝试定位序号
          const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
          this.taskIndex = dialogTasks.indexOf(routeTask);
          return;
        }
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        const currentTask = localStorage.getItem('currentDialogTask');
        
        if (currentTask && dialogTasks.includes(currentTask)) {
          this.currentTaskName = currentTask;
          this.taskIndex = dialogTasks.indexOf(currentTask);
        } else if (dialogTasks.length > 0) {
          this.currentTaskName = dialogTasks[dialogTasks.length - 1];
          this.taskIndex = dialogTasks.length - 1;
        } else {
          this.currentTaskName = 'Results任务';
          this.taskIndex = -1;
        }
      } catch (error) {
        console.error('获取任务名称失败:', error);
        this.currentTaskName = 'Results任务';
        this.taskIndex = -1;
      }
    },
    
    /**
     * 保存Results数据到数据库
     */
    async saveResultsToDatabase() {
      try {
        const response = await this.safeFetch('/api/save-results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskName: this.currentTaskName,
            analysisId: this.analysisId,
            selectedIssues: this.selectedIssues,
            solution1Title: this.articles[0].title,
            solution1Content: this.articles[0].content,
            solution2Title: this.articles[1].title,
            solution2Content: this.articles[1].content
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Results数据已保存到数据库，ID:', result.id);
          return result.id;
        } else {
          console.error('保存Results数据失败:', response.status);
          return null;
        }
      } catch (error) {
        console.error('数据库保存操作失败:', error);
        return null;
      }
    },
    
    goToTemplateSelection() {
      this.$router.push({ name: 'TemplateSelection', query: { from: 'results', analysisId: this.analysisId || '' } });
    },
    goToTemplateSelectionRight() {
      this.goToTemplateSelection();
    },
    async regenerateSolution(index) {
      try {
        if (this.loading[index]) return;
        if (!this.selectedIssues) {
          alert('缺少问题上下文，无法重新思考');
          return;
        }
        const issuesList = this.selectedIssues; // 已是换行分隔
        const baseInstruction = `你将针对下面列出的关键问题生成两个互补的综合技术解决方案。要求：\n1) 每个方案均需包含: 总体目标, 关键问题映射表(问题->对应策略/措施), 分阶段实施步骤(含里程碑), 关键输入与输出, 风险与规避, 度量指标与验收标准, 可扩展/演进方向。\n2) 方案一：务实、工程化、易落地，强调风险控制与成本/进度。\n3) 方案二：创新、发散，鼓励新技术/差异化路径，提供 2~3 条备选策略分支。\n4) 两个方案都需要确保“每个输入问题”都在映射表或正文中能被追踪。缺少信息可合理假设并用(假设)标记。`;
        const prompt1 = `${baseInstruction}\n\n【输入问题列表】\n${issuesList}\n\n请输出方案一 (务实工程化)。先给<关键问题映射表>(列:问题,策略,对应步骤编号)，然后输出主体结构。`;
        const prompt2 = `${baseInstruction}\n\n【输入问题列表】\n${issuesList}\n\n请输出方案二 (创新发散)。先给<关键问题映射表>(列:问题,创新思路,潜在价值,风险)，然后主体结构需包含2~3条备选策略分支。`;
        const prompt = index === 0 ? prompt1 : prompt2;
        this.$set ? this.$set(this.loading, index, true) : (this.loading[index] = true);
        const resp = await fetch(this.API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-v3',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1800
          })
        });
        if (!resp.ok) {
          const txt = await resp.text().catch(()=> '');
            this.articles[index].content = `AI响应错误: ${resp.status} ${txt.slice(0,200)}`;
        } else {
          const data = await resp.json();
          const aiContent = data?.choices?.[0]?.message?.content?.trim();
          this.articles[index].content = aiContent || 'AI未返回内容，请稍后再试。';
        }
        // 保存整组（两个方案）入库，生成历史版本
        await this.saveResultsToDatabase();
      } catch (e) {
        this.articles[index].content = '重新思考失败：' + (e?.message || e);
      } finally {
        this.$set ? this.$set(this.loading, index, false) : (this.loading[index] = false);
      }
    }
  },
  watch: {}
};
</script>

<style scoped>
.ai-agent-page {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #e0e7ff 0%, #f9f9f9 100%);
  min-height: 100vh;
  padding: 0;
  margin: 0;
}

.header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 18px 0 18px 0;
  background: linear-gradient(90deg, #007bff 0%, #5a8cff 100%);
  color: white;
  border-radius: 0 0 18px 18px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(60, 60, 120, 0.10);
}

.page-body {
  display: flex;
  gap: 16px;
  align-items: stretch;
  padding: 0 16px 16px 16px;
}

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
  margin: 0 0 16px 0;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
  font-size: 1.1em;
  font-weight: 600;
}

.logo-placeholder {
  font-size: 2em;
  font-weight: 800;
  letter-spacing: 2px;
}

.content {
  padding: 24px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(60, 60, 120, 0.10);
  flex: 1;
}

.article-row {
  display: flex;
  gap: 32px;
  margin-bottom: 32px;
}

.articles {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 初步综合方案区域已移除，相关样式删除 */

.article {
  flex: 1;
  background: linear-gradient(135deg, #f0f4ff 0%, #fff 100%);
  padding: 28px 22px 22px 22px;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(60, 60, 120, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
}

.article:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 6px 24px rgba(60, 60, 120, 0.16);
}

/* 预览标题样式 */
.article-title {
  margin: 6px 0 12px;
  font-size: 1.2em;
  color: #2d3a4b;
  font-weight: 700;
}

.article-title-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.regen-btn { padding:6px 14px; background:#ff9800; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600; letter-spacing:1px; }
.regen-btn[disabled] { opacity:0.55; cursor:not-allowed; }
.regen-btn:hover:not([disabled]) { background:#fb8c00; }

.article .date {
  font-size: 0.98em;
  color: #5a5a89;
  margin-bottom: 8px;
  font-weight: 500;
  letter-spacing: 1px;
}

/* 删除编辑态样式（textarea）并保持预览样式为主 */

.md-preview {
  margin-top: 12px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  max-height: 360px;
  overflow: auto;
}

.md-preview :deep(pre) {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 10px;
  overflow-x: auto;
}

.md-preview :deep(code) {
  background: #f3f4f6;
  border-radius: 4px;
  padding: 2px 6px;
}

.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3) {
  margin-top: 10px;
}

.add-to-favorites {
  text-align: right;
  margin-top: 18px;
}

.add-to-favorites button {
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
  margin-left: 16px;
}

.add-to-favorites button:first-child {
  background: linear-gradient(90deg, #007bff 0%, #5a8cff 100%);
}

.add-to-favorites button:first-child:hover {
  background: linear-gradient(90deg, #0056b3 0%, #007bff 100%);
}

.add-to-favorites button:hover {
  background: linear-gradient(90deg, #218838 0%, #43d477 100%);
  box-shadow: 0 4px 16px rgba(60, 60, 120, 0.15);
}

@media (max-width: 900px) {
  .article-row {
    flex-direction: column;
    gap: 18px;
  }
  .page-body { padding: 0 8px 8px; }
  .sidebar-left { display: none; }
  .content { padding: 12px; }
}
</style>