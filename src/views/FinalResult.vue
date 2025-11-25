<template>
  <div class="final-result" v-loading="isGenerating" v-bind="loadingProps">
    <!-- 左侧可折叠边栏：承接 TemplateSelection 的呈现（任务序号 + 名称） -->
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
    
    <!-- 主要内容区域 -->
    <main class="main-content">
      <h1>最终结果</h1>
      <div class="result-content">
        <div class="result-card">
          <h2>标题</h2>
          <div class="result-title">{{ title }}</div>
          <h2>最终结果</h2>
          <div class="result-markdown" v-html="renderMarkdown(finalResult)"></div>
          <div class="stream-wrapper">
            <div class="stream-title">AI 整合的完整技术方案</div>
            <div class="stream-box">
              <template v-if="streamError">
                <div class="stream-error">{{ streamError }}</div>
              </template>
              <template v-else>
                <div v-if="!aiCombinedPlan && streaming" class="stream-loading">AI 正在生成完整方案…</div>
                <div v-else v-html="renderCombinedMarkdown()"></div>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div class="next-button">
        <div class="actions-row">
          <button class="secondary" @click="regeneratePlan" :disabled="streaming || isGenerating">重新思考</button>
          <button @click="sendResultToAI" :disabled="isGenerating || streaming">生成实施方案</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { marked } from 'marked'; // 引入 marked 库
import { ElIcon } from 'element-plus';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { useLoading, defaultLoadingConfig, getLoadingProps } from '@/utils';

export default {
  name: 'FinalResult',
  setup() {
    const { isGenerating, startGenerating, stopGenerating } = useLoading();
    const loadingProps = getLoadingProps(defaultLoadingConfig);
    return { isGenerating, startGenerating, stopGenerating, loadingProps };
  },
  data() {
    return {
      title: this.$route.query.title || '',
      finalResult: this.$route.query.finalResult || '',
  methodContent: this.$route.query.methodContent || '',
  baseContent: this.$route.query.baseContent || '',
  chosenSide: this.$route.query.chosenSide || '',
      API_URL: '/api/ai', // 替换为实际的 API 地址
      currentTaskName: '', // 当前任务名称
      totalTaskCount: 0, // 总任务数
      recentTasks: [], // 最近的任务列表
      // 新增：侧边栏收起状态与任务序号
      sidebarCollapsed: false,
      taskIndex: -1,
  // 流式生成相关
  streaming: false,
  streamError: '',
  aiCombinedPlan: '',
  combinedPlanLoaded: false,
    };
  },
  components: { ElIcon, 'el-icon-arrow-left': ArrowLeft, 'el-icon-arrow-right': ArrowRight },
  computed: {
    displayedTaskNumber() {
      return this.taskIndex >= 0 ? this.taskIndex + 1 : '-';
    }
  },
  created() {
    // 获取当前任务名称
    this.getCurrentTaskName();
    
    // 加载任务数据
    this.loadDialogTasks();
  // 持久化最终结果，供后续下载报告使用
  // 优先：若路由未携带大字段，则尝试从 localStorage 取
  if ((!this.methodContent && !this.baseContent) || !this.finalResult) {
    try {
      const cache = JSON.parse(localStorage.getItem('finalResultPayload') || 'null');
      if (cache) {
        this.title = this.title || cache.title || '';
        this.finalResult = this.finalResult || cache.finalResult || '';
        this.methodContent = this.methodContent || cache.methodContent || '';
        this.baseContent = this.baseContent || cache.baseContent || '';
        this.chosenSide = this.chosenSide || cache.chosenSide || '';
        if (!this.currentTaskName && cache.taskName) this.currentTaskName = cache.taskName;
      }
    } catch (_) {}
  }
  this.saveFinalToLocal();
  // 触发流式扩展 AI 完整技术方案
  this.loadExistingOrStream();
  },
  methods: {
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
          this.currentTaskName = 'FinalResult任务';
          this.taskIndex = -1;
        }
      } catch (error) {
        console.error('获取任务名称失败:', error);
        this.currentTaskName = 'FinalResult任务';
        this.taskIndex = -1;
      }
    },
    toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; },
    
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
    // 将最终结果保存到本地，供可视化页下载
    saveFinalToLocal() {
      try {
        const payload = { title: this.title, finalResult: this.finalResult, taskName: this.currentTaskName };
        localStorage.setItem('report:finalResult', JSON.stringify(payload));
      } catch (_) {}
    },
    
    renderMarkdown(markdown) {
      return marked(markdown); // 使用 marked 渲染 Markdown
    },
    // 紧凑版：压缩多余空行，供 AI 整合方案使用
    compressBlankLines(text) {
      if (!text) return '';
      // 去掉行尾多余空格
      let t = text.replace(/[ \t]+$/gm, '');
      // 连续 3 行以上空行压缩为 1 行
      t = t.replace(/\n{3,}/g, '\n\n');
      return t;
    },
    renderCombinedMarkdown() {
      return marked(this.compressBlankLines(this.aiCombinedPlan || ''));
    },
    async loadExistingOrStream() {
      if (!this.currentTaskName) return;
      // 查询后端是否已有记录
      try {
        const res = await fetch(`/api/final-result-expanded/${encodeURIComponent(this.currentTaskName)}`);
        if (res.ok) {
          const data = await res.json();
            if (data?.record?.combined_plan) {
            this.aiCombinedPlan = data.record.combined_plan;
            this.combinedPlanLoaded = true;
            // 本地缓存供 Visualization 导出
            try {
              localStorage.setItem('report:combinedPlan', this.aiCombinedPlan);
            } catch (_) {}
            return;
          }
        }
      } catch (e) {
        console.warn('查询已有整合方案失败:', e?.message);
      }
      // 没有则启动流式生成
      await this.startStreaming(true);
    },
    buildPrompt() {
      return [
        '你是一名高级技术方案设计专家。',
  '请将用户选定的“AI 推荐创新方法”与其对应的原始方案内容融合，输出一个结构化、可执行的技术方案（内容需尽量完整全面，覆盖所有关键环节）。',
        '要求：',
        '1. 先给出方案总体目标简述（不超过80字）。',
        '2. 分章节：背景与需求、关键矛盾/参数解析、核心原理与创新点、功能-对象-过程(FOP)映射、详细实施步骤、风险与对策、预期效益。',
        '3. 使用中文，条理清晰，分点列出；实施步骤按时间或逻辑顺序编号。',
        '4. 如果原始方案内容里有缺失信息，你可以做必要合理假设，并用（假设）标注。',
        '5. 不要输出与请求无关的客套语。',
        '提供数据：',
        '【AI 推荐创新方法】：\n' + (this.methodContent || '(无)'),
        '【原始方案内容】：\n' + (this.baseContent || '(无)')
      ].join('\n');
    },
    async startStreaming(shouldPersist = false) {
      if (!this.methodContent && !this.baseContent) return;
      this.streaming = true;
      this.streamError = '';
      this.aiCombinedPlan = '';
      const controller = new AbortController();
      this._streamAbort = controller;
      try {
        const response = await fetch('/api/combined-plan/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-v3',
            messages: [
              { role: 'system', content: '你是专业技术方案整合与创新设计专家。' },
              { role: 'user', content: this.buildPrompt() }
            ],
            max_tokens: 1800
          }),
          signal: controller.signal
        });
        if (!response.ok || !response.body) {
          this.streamError = 'AI 连接失败: ' + response.status;
          this.streaming = false;
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        const appendContent = (txt) => { this.aiCombinedPlan += txt; };
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE 按行分隔
          const lines = buffer.split(/\n\n/);
          buffer = lines.pop();
          for (const block of lines) {
            const line = block.trim();
            if (!line) continue;
            if (line.includes('[DONE]')) { buffer=''; break; }
            // 可能是多行 data: 前缀
            const dataLines = line.split('\n').filter(l=>l.startsWith('data:'));
            for (const dl of dataLines) {
              const payload = dl.replace(/^data:\s*/, '');
              if (!payload) continue;
              try {
                const json = JSON.parse(payload);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) appendContent(delta);
              } catch (_) {
                // 非 JSON 片段，忽略
              }
            }
          }
        }
        // 结束后持久化
        if (shouldPersist && this.currentTaskName && this.aiCombinedPlan) {
          try {
            await fetch('/api/final-result-expanded/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskName: this.currentTaskName,
                methodContent: this.methodContent,
                baseContent: this.baseContent,
                combinedPlan: this.aiCombinedPlan
              })
            });
            try { localStorage.setItem('report:combinedPlan', this.aiCombinedPlan); } catch (_) {}
          } catch (e) {
            console.warn('保存整合方案失败:', e?.message);
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          this.streamError = '已中止';
        } else {
          this.streamError = e?.message || '流式错误';
        }
      } finally {
        this.streaming = false;
      }
    },
    regeneratePlan() {
      this.combinedPlanLoaded = false;
      this.startStreaming(true);
    },
    copyPlan() {
      if (!this.aiCombinedPlan) return;
      try { navigator.clipboard.writeText(this.aiCombinedPlan); } catch (_) {}
    },
    async sendResultToAI() {
      if (this.isGenerating) return;
      this.startGenerating();
      this.saveFinalToLocal();
      let aiResponse = '';
      try {
        const response = await fetch(this.API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-v3',
            messages: [
              { role: 'user', content: `请对以下内容进行评分（五分制）：\n\n${this.finalResult}\n\n评分维度：准确性、清晰性、可解释性、创新性。` }
            ],
            max_tokens: 1500
          })
        });
        if (response.status === 200) {
          const data = await response.json();
          aiResponse = data?.choices?.[0]?.message?.content?.trim() || '';
        } else {
          aiResponse = '评分请求失败，状态码: ' + response.status;
          console.error(aiResponse);
        }
      } catch (error) {
        aiResponse = '评分异常: ' + (error?.message || error);
        console.error('请求失败:', error);
      } finally {
        this.stopGenerating();
      }
      // 无论成功失败都前往 Visualization（失败时也带提示文本方便排查）
      // 跳转至新页面 ExecutablePlan，中间再进入 Visualization
      this.$router.push({ name: 'ExecutablePlan', query: { aiScores: aiResponse } });
    }
  }
};
</script>

<style scoped>
.final-result {
  min-height: 100vh;
  background: linear-gradient(135deg, #e0e7ff 0%, #f9f9f9 100%);
  padding: 0;
  margin: 0;
  display: flex;
}
/* 新左侧折叠边栏，与其他页面统一 */
.sidebar-left {
  width: 260px;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 20px 16px 16px 16px;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  position: relative;
  border-radius: 0 12px 12px 0;
  transition: width 0.3s ease, padding 0.3s ease;
  min-height: 100vh;
}
.sidebar-left.collapsed { width: 48px; padding: 20px 6px; align-items: center; }
.sidebar-left h3 { margin: 0 0 16px 0; font-size: 1.1em; text-align: center; color: #ecf0f1; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 8px; font-weight: 600; }
.sidebar-left .task-no { background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 12px; }
.sidebar-left .task-no .no { font-weight: 800; color: #f39c12; }
.sidebar-left .task-name { font-weight: 600; font-size: 0.98em; word-break: break-word; }
.sidebar-left .mini { color: #ecf0f1; font-weight: 700; writing-mode: vertical-rl; text-orientation: mixed; }
.toggle-icon { position: absolute; top: 10px; right: 10px; cursor: pointer; font-size: 1.2em; color: #f1f1f1; transition: color 0.2s ease; }
.toggle-icon:hover { color: #f39c12; }

/* 主要内容区域样式 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

h1 {
  margin-top: 48px;
  font-size: 2.5rem;
  color: #3b3b6d;
  letter-spacing: 2px;
  font-weight: 700;
  text-align: center;
}

.result-content {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.result-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(60, 60, 120, 0.10);
  padding: 36px 48px;
  max-width: 700px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.result-card h2 {
  margin-top: 0;
  font-size: 1.3em;
  color: #2d3a4b;
  font-weight: 600;
  margin-bottom: 8px;
}

.result-title {
  font-size: 1.15em;
  color: #007bff;
  background: #f0f4ff;
  padding: 10px 16px;
  border-radius: 6px;
  margin-bottom: 24px;
  width: 100%;
  word-break: break-all;
}

.result-markdown {
  font-size: 1.1em;
  color: #444;
  background: #f7fafd;
  padding: 18px 18px 18px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.06);
  width: 100%;
  min-height: 120px;
  word-break: break-all;
}

/* 流式扩展方案显示 */
.stream-wrapper { margin-top: 28px; width: 100%; }
.stream-title { font-size: 1.15em; font-weight: 600; color: #2d3a4b; margin-bottom: 10px; }
.stream-box { background: #fff; border: 1px solid #d9e2f1; border-radius: 8px; padding: 16px 20px 60px 20px; min-height: 140px; box-shadow: 0 2px 10px rgba(60,60,120,0.06); white-space: pre-wrap; line-height: 1.55; font-size: 0.96em; position: relative; }
.stream-actions { position: absolute; bottom: 10px; right: 12px; display: flex; gap: 12px; }
.stream-actions button { padding: 6px 14px; font-size: 12px; border: 1px solid #4a6eff; background: linear-gradient(90deg,#5f7dff,#7292ff); color: #fff; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 6px rgba(60,60,120,0.15); }
.stream-actions button:hover { background: linear-gradient(90deg,#4a6eff,#5f7dff); }
.stream-loading { color: #5a5a89; font-style: italic; }
.stream-error { color: #c0392b; font-weight: 600; margin-top: 8px; }

.result-markdown :deep(p) {
  margin: 0 0 10px 0;
}

.next-button {
  width: 100%;
  max-width: 700px;
  margin: 32px auto 0 auto;
  text-align: right;
}

.next-button .actions-row { display:flex; justify-content:flex-end; gap:14px; }

.next-button button {
  padding: 12px 32px;
  background: linear-gradient(90deg, #007bff 0%, #5a8cff 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s, box-shadow 0.3s;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
}
.next-button button.secondary { background: linear-gradient(90deg,#6c757d 0%,#8d99a5 100%); }
.next-button button.secondary:hover { background: linear-gradient(90deg,#5a6268 0%, #6c757d 100%); }
.next-button button:disabled { opacity:0.6; cursor:not-allowed; }

.next-button button:hover {
  background: linear-gradient(90deg, #0056b3 0%, #007bff 100%);
  box-shadow: 0 4px 16px rgba(60, 60, 120, 0.15);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .final-result {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    min-height: auto;
    padding: 15px;
    order: -1;
  }
  
  .main-content {
    padding: 15px;
  }
  
  .result-card {
    padding: 24px 20px;
  }
  
  .next-button {
    max-width: 100%;
    padding: 0 20px;
  }
}
</style>