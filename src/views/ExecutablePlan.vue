<template>
  <div class="executable-plan" v-loading="isGenerating || isLoadingCtx" v-bind="loadingProps">
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

    <main class="main-content">
      <h1>可执行实施方案生成</h1>
      <div class="config-card">
        <h2>生成配置</h2>
        <div class="form-grid">
          <div class="form-item">
            <label>目标语言</label>
            <select v-model="targetLanguage">
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="go">Go</option>
              <option value="java">Java</option>
            </select>
          </div>
          <div class="form-item">
            <label>方案粒度</label>
            <select v-model="detailLevel">
              <option value="skeleton">骨架结构</option>
              <option value="modules">关键模块 + 核心算法</option>
              <option value="full">近完整实现（示例代码）</option>
            </select>
          </div>
          <div class="form-item">
            <label>运行环境</label>
            <select v-model="runtimeEnv">
              <option value="web">Web 前端</option>
              <option value="backend">后端服务 (API)</option>
              <option value="fullstack">前后端全栈</option>
              <option value="cli">CLI 工具</option>
            </select>
          </div>
          <div class="form-item checkbox-row">
            <label><input type="checkbox" v-model="includeTests" /> 包含测试计划</label>
          </div>
          <div class="form-item checkbox-row">
            <label><input type="checkbox" v-model="includeDeployment" /> 包含部署与运维</label>
          </div>
          <div class="form-item checkbox-row">
            <label><input type="checkbox" v-model="includeSecurity" /> 安全与性能策略</label>
          </div>
        </div>
        <div class="actions">
          <button @click="generatePlan" :disabled="isGenerating || isLoadingCtx">生成实施方案</button>
          <button class="secondary" @click="generateCodeOnly" :disabled="isGenerating || isLoadingCtx">仅生成代码样例</button>
        </div>
      </div>

      <div class="result-section" v-if="planMarkdown || codeSamplesMarkdown">
        <h2>AI 生成结果</h2>
        <div v-if="planMarkdown" class="markdown-block" v-html="renderMarkdown(planMarkdown)"></div>
        <div v-if="codeSamplesMarkdown" class="markdown-block" v-html="renderMarkdown(codeSamplesMarkdown)"></div>
        <div class="code-extract" v-if="extractedCodeBlocks.length">
          <h3>代码片段 (可复制)</h3>
          <div class="code-item" v-for="(blk, i) in extractedCodeBlocks" :key="i">
            <div class="code-meta">
              <span class="lang">{{ blk.lang || 'text' }}</span>
              <button @click="copyCode(blk.code)">复制</button>
            </div>
            <pre><code>{{ blk.code }}</code></pre>
          </div>
        </div>
        <div class="save-actions">
          <button @click="saveLocally" :disabled="!planMarkdown && !codeSamplesMarkdown">保存到本地缓存</button>
          <button @click="goNext" :disabled="isGenerating">进入可视化</button>
        </div>
      </div>

      <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
    </main>
  </div>
</template>

<script>
import { ElIcon } from 'element-plus';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { marked } from 'marked';
import { useLoading, defaultLoadingConfig, getLoadingProps } from '@/utils';

export default {
  name: 'ExecutablePlan',
  components: { ElIcon, 'el-icon-arrow-left': ArrowLeft, 'el-icon-arrow-right': ArrowRight },
  setup() {
    const { isGenerating, startGenerating, stopGenerating } = useLoading();
    const loadingProps = getLoadingProps(defaultLoadingConfig);
    return { isGenerating, startGenerating, stopGenerating, loadingProps };
  },
  data() {
    return {
      currentTaskName: '',
      taskIndex: -1,
      sidebarCollapsed: false,
      // 配置
      targetLanguage: 'typescript',
      detailLevel: 'modules',
      runtimeEnv: 'fullstack',
      includeTests: true,
      includeDeployment: true,
      includeSecurity: true,
      // 上游数据
      finalResult: '',
      combinedPlan: '',
      frameworks: {}, // {trend, system, fop}
      subTasks: [],
      problems: [],
      // 结果
      planMarkdown: '',
      codeSamplesMarkdown: '',
      extractedCodeBlocks: [],
      errorMsg: '',
      isLoadingCtx: false,
      aiScores: this.$route.query.aiScores || ''
    };
  },
  computed: {
    displayedTaskNumber() { return this.taskIndex >= 0 ? this.taskIndex + 1 : '-'; }
  },
  created() {
    this.resolveTaskName();
    this.loadContext();
  },
  methods: {
    toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; },
    resolveTaskName() {
      try {
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        const currentTask = localStorage.getItem('currentDialogTask');
        if (currentTask && dialogTasks.includes(currentTask)) {
          this.currentTaskName = currentTask; this.taskIndex = dialogTasks.indexOf(currentTask);
        } else if (dialogTasks.length) {
          this.currentTaskName = dialogTasks[dialogTasks.length - 1]; this.taskIndex = dialogTasks.length - 1;
        } else { this.currentTaskName = 'ExecutablePlan任务'; }
      } catch (_) { this.currentTaskName = 'ExecutablePlan任务'; }
    },
    async loadContext() {
      this.isLoadingCtx = true; this.errorMsg='';
      try {
        // 本地获取最终结果与整合方案
        try { const fr = JSON.parse(localStorage.getItem('report:finalResult') || 'null'); this.finalResult = fr?.finalResult || ''; } catch(_) {}
        try { this.combinedPlan = localStorage.getItem('report:combinedPlan') || ''; } catch(_) {}
        // 从 sessionStorage taskPlan 取三框架内容
        try {
          const raw = sessionStorage.getItem('taskPlan');
          if (raw) {
            const plan = JSON.parse(raw); const arr = Array.isArray(plan?.tasks)? plan.tasks: [];
            this.frameworks.trend = arr.find(t=>String(t.id)==='trend')?.content || '';
            this.frameworks.system = arr.find(t=>String(t.id)==='system')?.content || '';
            this.frameworks.fop = arr.find(t=>String(t.id)==='fop')?.content || '';
          }
        } catch(_) {}
        // 后端拉取子任务与问题（可选）
        if (this.currentTaskName) {
          const fetchJson = async (url) => { try { const r = await fetch(url); if (!r.ok) return null; return await r.json(); } catch(_) { return null; } };
          const subData = await fetchJson(`/api/sub-tasks/${encodeURIComponent(this.currentTaskName)}`);
          if (Array.isArray(subData?.subTasks)) this.subTasks = subData.subTasks.map(s=>s.sub_task_name);
          const probData = await fetchJson(`/api/task-problems/${encodeURIComponent(this.currentTaskName)}`);
          if (probData?.problems) {
            this.problems = Object.values(probData.problems).flat().map(p=>p.problem_text || p.text).filter(Boolean).slice(0,12);
          }
        }
      } catch(e) { this.errorMsg = '加载上下文失败: ' + e.message; }
      finally { this.isLoadingCtx = false; }
    },
    buildPlanPrompt() {
      const sections = [
        '你是一名资深解决方案架构师和高级开发工程师。请基于提供的完整流程上下文生成一个“可实施技术方案文档”。',
        '文档目标：让一个经验中等的开发小组能够据此启动并完成实现。',
        '必须包含章节：1. 总览与目标 2. 架构图文字描述 3. 模块职责表(表格) 4. 数据与接口设计 5. 核心算法/逻辑 6. 核心环节验证(重点) 7. 关键代码骨架(核心环节) 8. 测试策略 9. 部署与运维 10. 安全 & 性能 11. 风险与回滚策略。',
        '特别要求：',
        '1. “逐步实施里程碑”章节可简化或省略，重点放在方案的可行性验证上。',
        '2. “核心环节验证”章节必须包含：实施方案代码运行后的预期结果、数据图表（用文字描述图表内容）、以及基于结果的结论，以证明方案切实可行。',
        '3. 代码部分必须是最终方案中的核心环节（如核心算法、关键业务流），用于证明方案可行性。如果是伪代码，逻辑必须清晰完备。',
        '4. 每段代码必须包含“预期运行结果”或“输出示例”（Output Example），以展示代码执行后的效果。',
        '语言与运行环境：' + this.targetLanguage + ' / ' + this.runtimeEnv,
        '粒度：' + this.detailLevel + ' (越详细越好，注意控制 token)',
        '是否含测试: ' + (this.includeTests? '是':'否') + ', 部署: ' + (this.includeDeployment? '是':'否') + ', 安全性能: ' + (this.includeSecurity? '是':'否'),
        '请使用 Markdown。代码使用```' + (this.targetLanguage === 'typescript' ? 'ts' : (this.targetLanguage === 'javascript' ? 'js' : (this.targetLanguage === 'python' ? 'python' : this.targetLanguage))) + ' 标记。',
        '若有假设请用（假设）标注。避免多余客套。',
        '原始最终结果：\n' + (this.finalResult || '(无)'),
        'AI整合方案摘要：\n' + (this.combinedPlan ? this.combinedPlan.slice(0,3000) : '(无)'),
        '三大框架提要：\n【主演化】\n' + (this.frameworks.trend || '(无)') + '\n【主系统】\n' + (this.frameworks.system || '(无)') + '\n【主作用】\n' + (this.frameworks.fop || '(无)'),
        '子任务列表：' + (this.subTasks.join('；') || '(无)'),
        '已识别子问题：' + (this.problems.join('；') || '(无)')
      ];
      return sections.join('\n');
    },
    buildCodeOnlyPrompt() {
      return [
        '你是一名资深开发工程师。请仅输出关键代码样例，不要写方案描述。',
        '目标语言：' + this.targetLanguage + ', 环境：' + this.runtimeEnv + ', 粒度：' + this.detailLevel,
        '特别要求：代码必须是最终方案中的核心环节，用于证明方案可行性。',
        '特别要求：每段代码后必须附带“预期运行结果”或“Console Output”示例，展示代码执行效果。',
        '特别要求：请在代码注释或输出说明中，简要解释该结果如何证明了方案的可行性（结论）。',
        '请提供：目录结构建议、核心模块样例、接口/数据模型定义、1-2 个核心算法实现（含运行结果）。',
        '使用 Markdown，代码块用正确语言标记。不要超过 1200 行。',
        '参考整合方案：\n' + (this.combinedPlan ? this.combinedPlan.slice(0,2500) : '(无)')
      ].join('\n');
    },
    async generatePlan() {
      this.startGenerating(); this.errorMsg=''; this.planMarkdown=''; this.codeSamplesMarkdown=''; this.extractedCodeBlocks=[];
      try {
        const prompt = this.buildPlanPrompt();
        const resp = await fetch('/api/ai', {
          method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${import.meta.env.VITE_API_KEY || ''}`},
          body: JSON.stringify({ model:'deepseek-v3', messages:[{role:'user', content: prompt}], max_tokens: 2500 })
        });
        if (!resp.ok) throw new Error('AI请求失败 ' + resp.status);
        const data = await resp.json();
        this.planMarkdown = data?.choices?.[0]?.message?.content?.trim() || '';
        this.extractCodeBlocks();
      } catch(e) { this.errorMsg = e.message; }
      finally { this.stopGenerating(); }
    },
    async generateCodeOnly() {
      this.startGenerating(); this.errorMsg=''; this.codeSamplesMarkdown=''; this.extractedCodeBlocks=[];
      try {
        const prompt = this.buildCodeOnlyPrompt();
        const resp = await fetch('/api/ai', {
          method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${import.meta.env.VITE_API_KEY || ''}`},
          body: JSON.stringify({ model:'deepseek-v3', messages:[{role:'user', content: prompt}], max_tokens: 2200 })
        });
        if (!resp.ok) throw new Error('AI请求失败 ' + resp.status);
        const data = await resp.json();
        this.codeSamplesMarkdown = data?.choices?.[0]?.message?.content?.trim() || '';
        this.extractCodeBlocks();
      } catch(e) { this.errorMsg = e.message; }
      finally { this.stopGenerating(); }
    },
    extractCodeBlocks() {
      const all = [this.planMarkdown, this.codeSamplesMarkdown].filter(Boolean).join('\n');
      const regex = /```(\w+)?\n([\s\S]*?)```/g;
      this.extractedCodeBlocks = [];
      let m; while((m = regex.exec(all))) {
        this.extractedCodeBlocks.push({ lang: (m[1]||'').trim(), code: m[2].trim() });
      }
    },
    copyCode(code) {
      try { navigator.clipboard.writeText(code); } catch(_) {}
    },
    async saveLocally() {
      try {
        // 统一与 Visualization.vue 读取格式: planText, codeOnlyText, codeBlocks[{language, code}]
        const codeBlocks = this.extractedCodeBlocks.map(b => ({ language: b.lang || 'text', code: b.code }));
        const payload = {
          taskName: this.currentTaskName,
          planText: this.planMarkdown,
          codeOnlyText: this.codeSamplesMarkdown,
          codeBlocks,
          // 兼容旧字段
          planMarkdown: this.planMarkdown,
          codeSamplesMarkdown: this.codeSamplesMarkdown,
          language: this.targetLanguage,
          env: this.runtimeEnv,
          savedAt: new Date().toISOString()
        };
        
        // 1. 保存到本地缓存 (作为备份/快速读取)
        localStorage.setItem('report:executablePlan', JSON.stringify(payload));

        // 2. 保存到服务器数据库
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const serverPayload = {
          taskName: this.currentTaskName,
          planText: this.planMarkdown,
          codeOnlyText: this.codeSamplesMarkdown,
          codeBlocks: codeBlocks,
          language: this.targetLanguage,
          env: this.runtimeEnv,
          userId: user.id
        };

        const resp = await fetch('/api/executable-plan/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify(serverPayload)
        });

        if (!resp.ok) {
          const errData = await resp.json();
          throw new Error(errData.message || '服务器保存失败');
        }

        alert('已保存到服务器数据库');
      } catch(e) { this.errorMsg='保存失败: '+ e.message; }
    },
    goNext() {
      // 直接进入 Visualization，保持评分结果透传
      this.$router.push({ name:'Visualization', query: { aiScores: this.aiScores || '' } });
    },
    renderMarkdown(md) { return marked(md || ''); }
  }
};
</script>

<style scoped>
.executable-plan { display:flex; min-height:100vh; background:linear-gradient(135deg,#e0e7ff 0%, #f9f9f9 100%); }
.sidebar-left { width:260px; background:linear-gradient(135deg,#2c3e50,#34495e); color:#fff; padding:20px 16px; position:relative; box-shadow:2px 0 8px rgba(0,0,0,0.2); display:flex; flex-direction:column; }
.sidebar-left.collapsed { width:48px; padding:20px 6px; align-items:center; }
.toggle-icon { position:absolute; top:10px; right:10px; cursor:pointer; }
.task-no { background:rgba(255,255,255,0.15); padding:12px; border-radius:8px; text-align:center; margin-bottom:12px; }
.task-no .no { font-weight:800; color:#f39c12; }
.task-name { font-weight:600; font-size:0.95em; word-break:break-word; }
.mini { color:#ecf0f1; font-weight:700; writing-mode:vertical-rl; }
.main-content { flex:1; padding:24px 32px; }
h1 { margin:12px 0 24px; font-size:2rem; color:#3b3b6d; font-weight:700; }
.config-card { background:#fff; border-radius:16px; padding:24px 28px; box-shadow:0 4px 20px rgba(60,60,120,0.12); margin-bottom:28px; }
.config-card h2 { margin:0 0 18px; font-size:1.3em; color:#2d3a4b; }
.form-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
.form-item label { font-size:0.85em; font-weight:600; color:#2d3a4b; display:block; margin-bottom:6px; }
.form-item select { width:100%; padding:8px 10px; border:1.5px solid #bfcfff; border-radius:6px; background:#f7fafd; font-size:0.95em; }
.checkbox-row { display:flex; align-items:center; gap:10px; padding-top:4px; }
.actions { margin-top:16px; display:flex; gap:14px; }
.actions button { padding:10px 22px; border:none; border-radius:6px; background:linear-gradient(90deg,#007bff,#5a8cff); color:#fff; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(60,60,120,0.15); }
.actions button.secondary { background:linear-gradient(90deg,#6c757d,#8d99a5); }
.actions button:disabled { opacity:0.6; cursor:not-allowed; }
.result-section { background:#fff; border-radius:16px; padding:24px 28px; box-shadow:0 4px 20px rgba(60,60,120,0.12); }
.markdown-block { background:#f7fafd; padding:16px 20px; border-radius:8px; box-shadow:0 2px 8px rgba(60,60,120,0.08); margin-bottom:24px; font-size:0.95em; word-break:break-word; }
.code-extract { margin-top:8px; }
.code-item { background:#ffffff; border:1px solid #d9e2f1; border-radius:8px; padding:12px 14px; margin-bottom:12px; box-shadow:0 1px 6px rgba(60,60,120,0.06); }
.code-meta { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.code-meta .lang { font-size:0.75em; font-weight:600; background:#eef2ff; padding:4px 8px; border-radius:4px; color:#3b3b6d; }
.code-meta button { padding:4px 10px; font-size:12px; border:none; border-radius:4px; background:#007bff; color:#fff; cursor:pointer; }
.save-actions { display:flex; gap:12px; margin-top:18px; }
.save-actions button { padding:10px 20px; border:none; border-radius:6px; background:linear-gradient(90deg,#28a745,#5be584); color:#fff; font-weight:600; cursor:pointer; }
.save-actions button:disabled { opacity:0.6; }
.error-box { margin-top:18px; color:#c0392b; font-weight:600; }
@media (max-width: 768px) { .executable-plan { flex-direction:column; } .sidebar-left { width:100%; min-height:auto; } .main-content { padding:16px; } }
</style>
