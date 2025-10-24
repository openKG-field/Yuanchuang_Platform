<template>
  <div class="visualization">
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
            @click="selectTask(task)"
            :class="{ 'active': selectedTask === task }"
          >
            <span class="task-name">{{ task }}</span>
          </li>
        </ul>

        <!-- 新增：历史评估记录 -->
        <div class="history-section" v-if="historyAssessments && historyAssessments.length">
          <h4 style="margin-top:12px;">历史评估</h4>
          <ul class="history-list">
            <li v-for="(rec, i) in historyAssessments.slice(0, 10)" :key="rec.id || i" class="history-item">
              <div class="history-line">
                <span class="h-task">{{ rec.task_name || '未命名' }}</span>
                <span class="h-time">{{ (rec.created_at || '').toString().slice(0,19).replace('T',' ') }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </aside>
    <div class="main-content">
      <h2>可视化图表</h2>
      <div class="content">
        <div class="filters" v-if="showTask1Content">
          <p>本方案通过 AI 评分，评估效果如下：</p>
          <div ref="scoresHtml" class="markdown-output" v-html="renderMarkdown(aiScores)"></div>
        </div>
        <div class="charts">
          <div v-if="showRadarChart" id="2d-chart" class="chart"></div>
        </div>
      </div>
      <div class="next-button">
        <button class="outline" @click="downloadReport">下载报告</button>
        <button @click="goToNextStep">下一步</button>
      </div>
      <!-- 隐藏区域：用于渲染最终结果HTML供导出PDF截图 -->
      <div ref="finalHtml" class="print-only" v-html="finalResultRendered"></div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts';
import { marked } from 'marked';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useSidebar } from '@/utils/sidebarMixin';

export default {
  name: "Visualization",
  setup() {
    // 使用侧栏 composable
    const { sidebarCollapsed, toggleSidebar } = useSidebar();
    
    return {
      sidebarCollapsed,
      toggleSidebar
    };
  },
  data() {
    return {
      aiScores: this.$route.query.aiScores || '',
      showRadarChart: false,
      showTask1Content: false,
      selectedTask: '', // 当前选中的任务
      radarData: [0, 0, 0, 0],
      totalTaskCount: 0, // 总任务数
      recentTasks: [], // 最近的任务列表
      historyAssessments: [], // 历史评估列表
      finalResultTitle: '',
      finalResultContent: '',
      combinedPlanContent: ''
    };
  },
  computed: {
    finalResultRendered() {
      return this.finalResultContent ? marked(this.finalResultContent) : '';
    }
  },
  mounted() {
    this.loadDialogTasks(); // 加载任务数据
    this.loadHistoryAssessments(); // 加载历史评估数据
    this.loadFinalResultFromLocal(); // 加载最终结果（标题与内容）
    this.loadCombinedPlan(); // 加载整合技术方案
    this.$nextTick(() => {
      this.initCharts();
    });
    // 若已存在评分数据则自动展示雷达图
    if (this.aiScores && this.aiScores.trim().length > 0) {
      this.showRadarChart = true;
      this.showTask1Content = true;
      try { this.updateRadarData(); } catch (_) {}
      this.$nextTick(()=> this.initCharts());
    }
  },
  methods: {
    initCharts() {
      if (this.showRadarChart) {
        const chart2D = echarts.init(document.getElementById('2d-chart'));
        const option2D = {
          title: {
            text: '雷达图示例'
          },
          tooltip: {},
          legend: {
            data: ['评分']
          },
          radar: {
            indicator: [
              { name: '准确性', max: 5.0 },
              { name: '清晰度', max: 5.0 },
              { name: '可解释性', max: 5.0 },
              { name: '创新性', max: 5.0 }
            ]
          },
          series: [{
            name: '评分',
            type: 'radar',
            data: [
              {
                value: this.radarData,
                name: '评分'
              }
            ]
          }]
        };
        chart2D.setOption(option2D);
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
     * 选择任务
     */
    selectTask(task) {
      this.selectedTask = task;
      this.showRadarChart = true;
      this.showTask1Content = true;
      this.updateRadarData();
      this.$nextTick(() => {
        this.initCharts();
      });
      console.log(`任务 ${task} 被选中`);
      
      // 选择任务后自动保存评估数据
      this.saveAssessmentData();
    },
    /**
     * 保存评估数据到数据库
     */
    async saveAssessmentData() {
      try {
        // 获取当前用户信息
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const assessmentData = {
          taskName: this.selectedTask,
          aiScores: this.aiScores,
          accuracyScore: this.radarData[0] || 0,
          clarityScore: this.radarData[1] || 0,
          interpretabilityScore: this.radarData[2] || 0,
          innovationScore: this.radarData[3] || 0,
          assessmentContent: this.aiScores,
          radarData: this.radarData,
          userId: user.id || null
        };

        const response = await fetch('/api/save-visualization-assessment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(assessmentData)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('评估数据保存成功:', result);
        } else {
          const errorData = await response.json();
          console.error('保存评估数据失败:', errorData);
        }
      } catch (error) {
        console.error('保存评估数据网络错误:', error);
      }
    },
    /**
     * 加载历史评估数据
     */
    async loadHistoryAssessments() {
      try {
        const response = await fetch('/api/visualization-assessments', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('历史评估数据:', result.assessments);
          // 保存到侧栏显示
          this.historyAssessments = Array.isArray(result?.assessments) ? result.assessments : [];
        } else {
          console.error('获取历史评估数据失败');
        }
      } catch (error) {
        console.error('获取历史评估数据网络错误:', error);
      }
    },
    handleTaskClick(task) {
      if (task === 'task1') {
        this.showRadarChart = this.selectedTask === 'task1';
        this.showTask1Content = this.selectedTask === 'task1';
        this.updateRadarData();
        this.$nextTick(() => {
          this.initCharts();
        });
      } else if (task === 'task2') {
        this.showRadarChart = this.selectedTask === 'task2';
        this.showTask1Content = false;
        this.updateRadarData();
        this.$nextTick(() => {
          this.initCharts();
        });
      }
      console.log(`任务 ${task} 被点击`);
    },
    updateRadarData() {
      try {
        if (this.aiScores.trim().startsWith('{') && this.aiScores.trim().endsWith('}')) {
          const scores = JSON.parse(this.aiScores);
          this.radarData = [
            scores.accuracy || 0,
            scores.clarity || 0,
            scores.interpretability || 0,
            scores.innovation || 0
          ];
        } else {
          const scores = this.extractScoresFromMarkdown(this.aiScores);
          this.radarData = [
            scores.accuracy || 0,
            scores.clarity || 0,
            scores.interpretability || 0,
            scores.innovation || 0
          ];
        }
      } catch (error) {
        console.error("Error processing aiScores:", this.aiScores, error);
        this.radarData = [0, 0, 0, 0];
      }
    },
    extractScoresFromMarkdown(markdown) {
      const scores = {};
      try {
        const accuracyMatch = markdown.match(/准确性.*?(\d(\.\d)?)/);
        const clarityMatch = markdown.match(/清晰性.*?(\d(\.\d)?)/);
        const interpretabilityMatch = markdown.match(/可解释性.*?(\d(\.\d)?)/);
        const innovationMatch = markdown.match(/创新性.*?(\d(\.\d)?)/);

        scores.accuracy = accuracyMatch ? parseFloat(accuracyMatch[1]) : 0;
        scores.clarity = clarityMatch ? parseFloat(clarityMatch[1]) : 0;
        scores.interpretability = interpretabilityMatch ? parseFloat(interpretabilityMatch[1]) : 0;
        scores.innovation = innovationMatch ? parseFloat(innovationMatch[1]) : 0;
      } catch (error) {
        console.error("Error extracting scores from Markdown:", markdown, error);
      }
      return scores;
    },
    renderMarkdown(markdown) {
      return marked(markdown);
    },
    loadFinalResultFromLocal() {
      try {
        const raw = localStorage.getItem('report:finalResult');
        if (!raw) return;
        const data = JSON.parse(raw);
        this.finalResultTitle = data?.title || '';
        this.finalResultContent = data?.finalResult || '';
      } catch (_) {}
    },
    async loadCombinedPlan() {
      // 优先后端查询（需 taskName）
      const taskName = this.selectedTask || this.getCurrentTaskNameFallback();
      if (taskName) {
        try {
          const res = await fetch(`/api/final-result-expanded/${encodeURIComponent(taskName)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.record?.combined_plan) {
              this.combinedPlanContent = data.record.combined_plan;
              try { localStorage.setItem('report:combinedPlan', this.combinedPlanContent); } catch (_) {}
              return;
            }
          }
        } catch (_) {}
      }
      // 回退本地缓存
      try {
        const local = localStorage.getItem('report:combinedPlan');
        if (local) this.combinedPlanContent = local;
      } catch (_) {}
    },
  async downloadReport() {
      try {
        // 确保需要输出的内容至少有一项
        if (!this.finalResultContent && !this.combinedPlanContent && !this.aiScores) {
          alert('暂无可导出的内容');
          return;
        }
  // 确保雷达图已渲染（如果有评分数据但尚未点击任务）
  await this.ensureRadarChartPrepared();
        await this.$nextTick();
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = { left: 15, right: 15, top: 22, bottom: 15 };
        const contentWidth = pageWidth - margin.left - margin.right;
        const lineHeight = 6;

        const tocEntries = []; // {title, page}
        const title = this.finalResultTitle || '最终方案报告';
        const taskName = this.selectedTask || this.getCurrentTaskNameFallback() || '未选择';
        const taskLine = `任务：${taskName}`;

  // 封面页占位（稍后用图像覆盖，避免中文乱码）
  // 目录页（占位，稍后用图像覆盖）
        pdf.addPage();
        const tocPageNumber = pdf.getNumberOfPages();
  // 不写中文，防止乱码，占位

        // 渲染中文标题为图片，避免字体乱码（优化版本，降低分辨率）
        const renderHeaderImage = async (text) => {
          const div = document.createElement('div');
          div.style.position = 'absolute';
          div.style.left = '-9999px';
          div.style.top = '-9999px';
          div.style.width = '600px'; // 减小渲染宽度
          div.style.fontFamily = 'Segoe UI, Helvetica, Arial, \\u5FAE\\u8F6F\\u96C5\\u9ED1, sans-serif';
          div.style.padding = '10px 10px 0 10px';
          div.innerHTML = `<h2 style=\"margin:0;font-size:20px;font-weight:700;\">${this.escapeHtml(text)}</h2>`;
          document.body.appendChild(div);
          const canvas = await html2canvas(div, { 
            scale: 1.2, // 降低缩放比例
            useCORS: true,
            allowTaint: true,
            imageTimeout: 5000,
            removeContainer: true
          });
          document.body.removeChild(div);
          const ratio = canvas.height / canvas.width;
          const w = contentWidth;
          const h = w * ratio;
          return { dataUrl: canvas.toDataURL('image/jpeg', 0.7), height: h }; // 使用JPEG格式并压缩
        };

        // 工具函数：多页添加（图片切片 + 图片标题）- 优化版本
        const addCanvasMultiPage = async (canvas, headerText) => {
          pdf.addPage();
          const startPage = pdf.getNumberOfPages();
          const headerImg = await renderHeaderImage(headerText);
          const headerY = margin.top - 6; // 微调
          pdf.addImage(headerImg.dataUrl, 'JPEG', margin.left, headerY, contentWidth, headerImg.height);
          const topAfterHeader = headerY + headerImg.height + 2;
          const availableHeight = pageHeight - topAfterHeader - margin.bottom;
          const scaleWidth = contentWidth;
          const pxPerMm = canvas.width / scaleWidth;
          const sliceHeightPx = availableHeight * pxPerMm;
          const totalRatio = canvas.height / canvas.width;
          const scaledFullHeight = scaleWidth * totalRatio;
          if (scaledFullHeight <= availableHeight) {
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.7), 'JPEG', margin.left, topAfterHeader, scaleWidth, scaledFullHeight);
          } else {
            let rendered = 0;
            let sliceIndex = 0;
            while (rendered < canvas.height) {
              if (sliceIndex > 0) {
                pdf.addPage();
                const contHeader = await renderHeaderImage(headerText + ' (续)');
                const hY = margin.top - 6;
                pdf.addImage(contHeader.dataUrl, 'JPEG', margin.left, hY, contentWidth, contHeader.height);
                const top2 = hY + contHeader.height + 2;
                const avail2 = pageHeight - top2 - margin.bottom;
                // 重新计算 pxPerMm（宽度不变）
                const pxPerMm2 = canvas.width / scaleWidth;
                const sliceHeightPx2 = avail2 * pxPerMm2;
                const currentSliceHeightPx = Math.min(sliceHeightPx2, canvas.height - rendered);
                const sliceCanvas = document.createElement('canvas');
                const sliceCtx = sliceCanvas.getContext('2d', { willReadFrequently: true });
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = currentSliceHeightPx;
                sliceCtx.drawImage(canvas, 0, rendered, canvas.width, currentSliceHeightPx, 0, 0, canvas.width, currentSliceHeightPx);
                const sliceRatio = currentSliceHeightPx / canvas.width;
                const sliceHeightMm = sliceRatio * scaleWidth;
                pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.7), 'JPEG', margin.left, top2, scaleWidth, sliceHeightMm);
                rendered += currentSliceHeightPx;
                sliceIndex++;
                continue;
              }
              const currentSliceHeightPx = Math.min(sliceHeightPx, canvas.height - rendered);
              const sliceCanvas = document.createElement('canvas');
              const sliceCtx = sliceCanvas.getContext('2d', { willReadFrequently: true });
              sliceCanvas.width = canvas.width;
              sliceCanvas.height = currentSliceHeightPx;
              sliceCtx.drawImage(canvas, 0, rendered, canvas.width, currentSliceHeightPx, 0, 0, canvas.width, currentSliceHeightPx);
              const sliceRatio = currentSliceHeightPx / canvas.width;
              const sliceHeightMm = sliceRatio * scaleWidth;
              pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.7), 'JPEG', margin.left, topAfterHeader, scaleWidth, sliceHeightMm);
              rendered += currentSliceHeightPx;
              sliceIndex++;
            }
          }
          tocEntries.push({ title: headerText, page: startPage });
        };

        // ============= 新增：集中抓取各阶段数据 (使用后台数据库) =============
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` };
        const safeFetchJson = async (url) => {
          try { const r = await fetch(url, { headers: authHeaders }); if (!r.ok) return null; return await r.json(); } catch(_) { return null; }
        };
        const encode = (s) => encodeURIComponent(s || '');
        const dialogPromise = user.id && taskName ? safeFetchJson(`/api/dialog-messages/${user.id}/${encode(taskName)}`) : Promise.resolve(null);
        const templatePromise = taskName ? safeFetchJson(`/api/ai-content/${encode(taskName)}`) : Promise.resolve(null);
        const taskManagerPromise = taskName ? safeFetchJson(`/api/task-manager-content/${encode(taskName)}`) : Promise.resolve(null);
        const taskPlanPromise = taskName ? safeFetchJson(`/api/task-plan/${encode(taskName)}`) : Promise.resolve(null);
        const taskProblemsPromise = taskName ? safeFetchJson(`/api/task-problems/${encode(taskName)}`) : Promise.resolve(null);
        const newIntegrationPromise = taskName ? safeFetchJson(`/api/integration-analysis/${encode(taskName)}`) : Promise.resolve(null);
        const resultsPromise = taskName ? safeFetchJson(`/api/results-solutions/${encode(taskName)}`) : Promise.resolve(null);
        const templateSelectionPromise = taskName ? safeFetchJson(`/api/template-selection/${encode(taskName)}`) : Promise.resolve(null);
        const finalResultPromise = taskName ? safeFetchJson(`/api/final-result-expanded/${encode(taskName)}`) : Promise.resolve(null);
        const [dialogData, templateData, taskManagerData, taskPlanData, taskProblemsData, integrationData, resultsData, templateSelData, finalResultData] = await Promise.all([
          dialogPromise, templatePromise, taskManagerPromise, taskPlanPromise, taskProblemsPromise, newIntegrationPromise, resultsPromise, templateSelectionPromise, finalResultPromise
        ]);

        // ============= 构建每个部分的 HTML (不包含标题，标题用 headerImage) =============
        const buildDiv = (inner) => { 
          const d = document.createElement('div'); 
          d.style.position='absolute'; 
          d.style.left='-9999px'; 
          d.style.top='-9999px'; 
          d.style.width='600px'; // 减小渲染宽度
          d.style.padding='5px 10px 15px 10px'; 
          d.style.fontFamily='Segoe UI, Helvetica, Arial, \u5FAE\u8F6F\u96C5\u9ED1, sans-serif'; 
          d.innerHTML = inner; 
          document.body.appendChild(d); 
          return d; 
        };
        const esc = (s) => this.escapeHtml(String(s||''));

        // 1. 对话记录
        let dialogHTML = '';
        try {
          const list = Array.isArray(dialogData?.messages) ? dialogData.messages : (Array.isArray(dialogData) ? dialogData : []);
          const sorted = [...list].sort((a,b)=>(a?.message_id||a?.id||0)-(b?.message_id||b?.id||0));
          dialogHTML = sorted.map(m=>`<div style=\"margin-bottom:8px;font-size:14px;line-height:1.5;\">`+
              `<span style=\"font-weight:600;color:${m.sender==='AI'?'#007bff':'#2c3e50'};\">${esc(m.sender||'用户')}:</span> `+
              `<span>${esc(m.user_question||m.ai_response||m.text||m.content||'')}</span>`+
            `</div>`).join('') || '<p>无对话记录</p>';
        } catch(_) { dialogHTML = '<p>对话记录获取失败</p>'; }

        // 2. Template AI 思考内容 (ai_content 表) 后端实际返回 {success:true, aiContents:[...]} 或直接数组
        let templateHTML = '';
        try {
          const contentsArr = Array.isArray(templateData?.aiContents) ? templateData.aiContents
            : (Array.isArray(templateData?.contents) ? templateData.contents
            : (Array.isArray(templateData) ? templateData : []));
          if (contentsArr.length) {
            const latest = contentsArr[contentsArr.length - 1];
            const fields = [latest?.area, latest?.audience, latest?.keywords, latest?.tone].filter(Boolean).join(' | ');
            const prompt = latest?.prompt || '';
            templateHTML = `<div style=\"font-size:13px;line-height:1.5;\">`+
              (fields?`<div style=\"margin-bottom:8px;color:#555;\">${esc(fields)}</div>`:'')+
              `<pre style=\"white-space:pre-wrap;font-size:13px;\">${esc(prompt)}</pre>`+
              `</div>`;
          } else templateHTML = '<p>无思考内容</p>';
        } catch(_) { templateHTML = '<p>获取模板思考失败</p>'; }

        // 3. Task Manager: 子任务 + 子问题 + 三框架（从 plan_tasks + versions + task_problems 聚合）
        let tmDetailHTML = '';
        try {
          // 优先从 /api/task-plan 获取标准 tasks
          let tasks = Array.isArray(taskPlanData?.tasks) ? taskPlanData.tasks : [];
          if (!tasks || tasks.length === 0) {
            // 回退从 task_manager_content 解析 plan_tasks
            const recordsArr = Array.isArray(taskManagerData?.taskManagerContents) ? taskManagerData.taskManagerContents
              : (Array.isArray(taskManagerData?.records) ? taskManagerData.records
              : (Array.isArray(taskManagerData) ? taskManagerData : []));
            const recFallback = recordsArr.length ? recordsArr[recordsArr.length -1] : null;
            if (recFallback) {
              let tasksRaw = (recFallback?.plan_tasks !== undefined && recFallback?.plan_tasks !== null && recFallback?.plan_tasks !== '') ? recFallback.plan_tasks
                : (recFallback?.added_tasks !== undefined ? recFallback.added_tasks : recFallback?.tasks);
              tasks = Array.isArray(tasksRaw) ? tasksRaw : (typeof tasksRaw === 'string' ? (()=>{try{return JSON.parse(tasksRaw);}catch{return [];} })() : []);
            }
          }
          if (!Array.isArray(tasks) || tasks.length === 0) {
            tmDetailHTML = '<p>无子任务数据</p>';
          } else {
            // 获取每个子任务的版本历史（以便拿到三种框架的最新内容）
            const versionsMap = {};
            await Promise.all((tasks || []).map(async (t) => {
              const subId = String(t.id);
              const v = await safeFetchJson(`/api/task-plan/${encode(taskName)}/versions?subTaskId=${encode(subId)}`);
              versionsMap[subId] = Array.isArray(v?.versions) ? v.versions : [];
            }));
            const groupedProblems = taskProblemsData?.problems || {};
            const renderMd = (md) => (md && typeof md === 'string') ? marked.parse(md) : '';
            const pickByNote = (arr, keyword) => {
              if (!Array.isArray(arr)) return null;
              const filt = arr.filter(e => (e?.note || '').includes(keyword));
              return filt.length ? filt[filt.length - 1] : null;
            };
            const sectionParts = [];
            for (let i = 0; i < tasks.length; i++) {
              const t = tasks[i] || {};
              const subId = String(t.id);
              const subName = esc(t.name || t.title || `子任务${i+1}`);
              const vlist = versionsMap[subId] || [];
              const vTrend = pickByNote(vlist, '主演化');
              const vSystem = pickByNote(vlist, '主系统');
              const vFop = pickByNote(vlist, '主作用');
              // 回退：若没有对应版本，用当前内容兜底
              const trendHtml = renderMd(vTrend?.content || t.content || '');
              const systemHtml = renderMd(vSystem?.content || '');
              const fopHtml = renderMd(vFop?.content || '');
              // 子问题（按名称分组）
              const pList = Array.isArray(groupedProblems[t.name]) ? groupedProblems[t.name] : [];
              const problemsHtml = pList.length
                ? ('<ul style="margin:6px 0 8px 18px;">' + pList.map(p => {
                    const flags = [p.isCritical ? '关键' : null, p.isSelected ? '已选' : null].filter(Boolean).join('/');
                    return `<li>${esc(p.description)}${flags ? ` <em style=\"color:#c00;\">(${flags})</em>` : ''}</li>`;
                  }).join('') + '</ul>')
                : '<p style="margin:6px 0;">（无已识别子问题）</p>';
              sectionParts.push(
                `<div style="margin:12px 0 18px;">`+
                  `<h4 style=\"margin:0 0 6px 0;\">${subName}</h4>`+
                  `<div style=\"margin:4px 0;\"><strong>子问题：</strong>${problemsHtml}</div>`+
                  `<div style=\"margin:8px 0;\"><strong>主演化（趋势分析）</strong><div>${trendHtml || '<p>（暂无）</p>'}</div></div>`+
                  `<div style=\"margin:8px 0;\"><strong>主系统（九宫格+因果分析）</strong><div>${systemHtml || '<p>（暂无）</p>'}</div></div>`+
                  `<div style=\"margin:8px 0;\"><strong>主作用（FOP分析）</strong><div>${fopHtml || '<p>（暂无）</p>'}</div></div>`+
                `</div>`
              );
            }
            tmDetailHTML = sectionParts.join('');
            if (!tmDetailHTML) tmDetailHTML = '<p>无子任务数据</p>';
          }
        } catch(_) { tmDetailHTML = '<p>获取子任务/问题/框架失败</p>'; }

        // 4. NewIntegration 分析 (new_integration_analysis) {success:true, analysisRecords:[...]}
        let integrationHTML = '';
        try {
          const recordsArr = Array.isArray(integrationData?.analysisRecords) ? integrationData.analysisRecords
            : (Array.isArray(integrationData) ? integrationData : []);
          const rec = recordsArr.length ? recordsArr[0] : null; // 按后端排序已是最新在前
          if (rec) {
            integrationHTML = '';
            if (rec.all_issues) integrationHTML += `<h4 style=\"margin:12px 0 4px;\">全部问题</h4><pre style=\"white-space:pre-wrap;font-size:13px;\">${esc(rec.all_issues)}</pre>`;
            if (rec.selected_issues) integrationHTML += `<h4 style=\"margin:12px 0 4px;\">用户选择的问题</h4><pre style=\"white-space:pre-wrap;font-size:13px;\">${esc(rec.selected_issues)}</pre>`;
            if (rec.ai_solution) integrationHTML += `<h4 style=\"margin:12px 0 4px;\">AI 初步方案</h4><pre style=\"white-space:pre-wrap;font-size:13px;\">${esc(rec.ai_solution)}</pre>`;
            if (!integrationHTML) integrationHTML = '<p>无分析数据</p>';
          } else integrationHTML = '<p>无分析数据</p>';
        } catch(_) { integrationHTML = '<p>获取分析失败</p>'; }

        // 5. Results 两个解决方案 {success:true, solutions:[...]}
        let resultsHTML = '';
        try {
          const list = Array.isArray(resultsData?.solutions) ? resultsData.solutions
            : (Array.isArray(resultsData) ? resultsData : []);
          const rec = list.length ? list[0] : null;
          if (rec) {
            if (rec.solution1_title || rec.solution1_content) {
              resultsHTML += `<div style=\"margin-bottom:12px;\"><strong>${esc(rec.solution1_title||'方案一')}</strong><pre style=\"white-space:pre-wrap;font-size:13px;\">${esc(rec.solution1_content||'')}</pre></div>`;
            }
            if (rec.solution2_title || rec.solution2_content) {
              resultsHTML += `<div style=\"margin-bottom:12px;\"><strong>${esc(rec.solution2_title||'方案二')}</strong><pre style=\"white-space:pre-wrap;font-size:13px;\">${esc(rec.solution2_content||'')}</pre></div>`;
            }
            if (!resultsHTML) resultsHTML = '<p>无解决方案</p>';
          } else resultsHTML = '<p>无解决方案</p>';
        } catch(_) { resultsHTML = '<p>获取解决方案失败</p>'; }

        // 6. Template-Selection 创新方法比较 {success:true, record: {...}}
        let tplSelHTML = '';
        try {
          const rec = templateSelData?.record || (Array.isArray(templateSelData?.records)? templateSelData.records[0]: null);
          if (rec) {
            const block = (titleTxt, content) => content ? `<div style=\"margin:8px 0;\"><strong>${esc(titleTxt)}</strong><pre style=\"white-space:pre-wrap;font-size:13px;\">${esc(content)}</pre></div>` : '';
            tplSelHTML = '' +
              block('左侧方案内容', rec.left_content) +
              block('右侧方案内容', rec.right_content) +
              block('左侧方案分析', rec.left_analysis) +
              block('右侧方案分析', rec.right_analysis) +
              block('左侧创新方法', rec.left_method) +
              block('右侧创新方法', rec.right_method);
            if (!tplSelHTML) tplSelHTML = '<p>无记录</p>';
          } else tplSelHTML = '<p>无记录</p>';
        } catch(_) { tplSelHTML = '<p>获取模板选择数据失败</p>'; }

        // 7. 最终整合 (FinalResult + Combined Plan)
        let finalResultHTML = '';
        try {
          const rec = finalResultData?.record || (Array.isArray(finalResultData)? finalResultData[finalResultData.length-1]: finalResultData);
          const methodContent = rec?.method_content || this.finalResultContent || '';
            const combined = rec?.combined_plan || this.combinedPlanContent || '';
          if (methodContent) finalResultHTML += `<h4 style=\"margin:12px 0 4px;\">最终结果</h4><div>${marked.parse(methodContent)}</div>`;
          if (combined) finalResultHTML += `<h4 style=\"margin:12px 0 4px;\">AI 整合的完整技术方案</h4><div>${marked.parse(combined)}</div>`;
          if (!finalResultHTML) finalResultHTML = '<p>无最终整合数据</p>';
        } catch(_) { finalResultHTML='<p>获取最终整合失败</p>'; }

        // ============= 按指定顺序添加各部分 (目录页之后) =============
        const sectionList = [
          { title:'对话记录', html: dialogHTML },
          { title:'Template 思考内容', html: templateHTML },
          { title:'子任务、子问题与三框架（Task-Manager）', html: tmDetailHTML },
          { title:'问题分析与选择 (NewIntegration)', html: integrationHTML },
          { title:'两个解决方案 (Results)', html: resultsHTML },
          { title:'方案创新方法对比 (Template-Selection)', html: tplSelHTML },
          { title:'最终整合结果 (Final-Result)', html: finalResultHTML }
        ];

        for (const sec of sectionList) {
          if (!sec.html) continue; // skip empty
          const div = buildDiv(sec.html);
          const canv = await html2canvas(div, { 
            scale: 1.2, // 降低缩放比例
            useCORS: true, 
            allowTaint: true,
            imageTimeout: 5000,
            removeContainer: true
          });
          await addCanvasMultiPage(canv, sec.title);
          document.body.removeChild(div);
        }

        // 8. 可视化雷达图 (保持最后) & AI 评分
        if (document.getElementById('2d-chart') && this.showRadarChart) {
          const chartCanvas = await html2canvas(document.getElementById('2d-chart'), { 
            scale: 1.5, // 降低雷达图分辨率
            useCORS: true, 
            backgroundColor: '#ffffff',
            allowTaint: true,
            imageTimeout: 5000,
            removeContainer: true
          });
          pdf.addPage();
          const startPage = pdf.getNumberOfPages();
          const headerImg = await renderHeaderImage('可视化雷达图');
          const headerY = margin.top - 6;
          pdf.addImage(headerImg.dataUrl, 'JPEG', margin.left, headerY, contentWidth, headerImg.height);
          const topAfterHeader = headerY + headerImg.height + 2;
          const ratioC = chartCanvas.height / chartCanvas.width;
          const imgH = contentWidth * ratioC;
          pdf.addImage(chartCanvas.toDataURL('image/jpeg', 0.8), 'JPEG', margin.left, topAfterHeader, contentWidth, imgH);
          tocEntries.push({ title: '可视化雷达图', page: startPage });
        }
        if (this.$refs.scoresHtml && this.aiScores) {
          const scoresCanvas = await html2canvas(this.$refs.scoresHtml, { 
            scale: 1.2, // 降低评分图分辨率
            useCORS: true,
            allowTaint: true,
            imageTimeout: 5000,
            removeContainer: true
          });
          await addCanvasMultiPage(scoresCanvas, 'AI 评分与说明');
        }

        // 使用 html2canvas 生成中文封面与目录图像以避免 PDF 字体不支持导致乱码
        // 1. 封面
        const coverDiv = document.createElement('div');
        coverDiv.style.position = 'absolute';
        coverDiv.style.left = '-9999px';
        coverDiv.style.top = '-9999px';
        coverDiv.style.width = '600px'; // 减小封面渲染宽度
        coverDiv.style.fontFamily = 'Segoe UI, Helvetica, Arial, \u5FAE\u8F6F\u96C5\u9ED1, sans-serif';
        coverDiv.style.padding = '40px 50px';
        coverDiv.innerHTML = `
          <h1 style="margin:0 0 24px 0;font-size:32px;font-weight:700;letter-spacing:2px;">${this.escapeHtml(title)}</h1>
          <p style="margin:8px 0 0 0;font-size:16px;">${this.escapeHtml(taskLine)}</p>
          <p style="margin:8px 0 0 0;font-size:14px;">生成时间：${this.escapeHtml(new Date().toLocaleString())}</p>
        `;
        document.body.appendChild(coverDiv);
        const coverCanvas = await html2canvas(coverDiv, { 
          scale: 1.2, // 降低封面分辨率
          useCORS: true,
          allowTaint: true,
          imageTimeout: 5000,
          removeContainer: true
        });
        document.body.removeChild(coverDiv);
        pdf.setPage(1); // 封面
        const coverRatio = coverCanvas.height / coverCanvas.width;
        const coverImgW = pageWidth - margin.left - margin.right;
        const coverImgH = coverImgW * coverRatio;
        pdf.addImage(coverCanvas.toDataURL('image/jpeg', 0.7), 'JPEG', margin.left, margin.top - 10, coverImgW, coverImgH);

        // 2. 目录
        tocEntries.sort((a,b)=> a.page - b.page);
        const tocDiv = document.createElement('div');
        tocDiv.style.position = 'absolute';
        tocDiv.style.left = '-9999px';
        tocDiv.style.top = '-9999px';
        tocDiv.style.width = '600px'; // 减小目录渲染宽度
        tocDiv.style.fontFamily = 'Segoe UI, Helvetica, Arial, \u5FAE\u8F6F\u96C5\u9ED1, sans-serif';
        tocDiv.style.padding = '30px 50px';
        let tocHtml = '<h2 style="margin:0 0 20px 0;font-size:24px;font-weight:700;">目录</h2><ol style="margin:0;padding-left:24px;font-size:14px;line-height:1.6;">';
        tocEntries.forEach((entry)=> {
          tocHtml += `<li style=\"margin-bottom:4px;display:flex;justify-content:space-between;\"><span>${this.escapeHtml(entry.title)}</span><span style=\"margin-left:16px;\">${entry.page}</span></li>`;
        });
        tocHtml += '</ol>';
        tocDiv.innerHTML = tocHtml;
        document.body.appendChild(tocDiv);
        const tocCanvas = await html2canvas(tocDiv, { 
          scale: 1.2, // 降低目录分辨率
          useCORS: true,
          allowTaint: true,
          imageTimeout: 5000,
          removeContainer: true
        });
        document.body.removeChild(tocDiv);
        pdf.setPage(tocPageNumber);
        const tocRatio = tocCanvas.height / tocCanvas.width;
        const tocImgW = pageWidth - margin.left - margin.right;
        const tocImgH = tocImgW * tocRatio;
        pdf.addImage(tocCanvas.toDataURL('image/jpeg', 0.7), 'JPEG', margin.left, margin.top - 10, tocImgW, tocImgH);

        // 添加页脚页码
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(10);
          const footer = `第 ${i} / ${totalPages} 页`;
          const w = pdf.getTextWidth(footer);
          pdf.text(footer, (pageWidth - w) / 2, pageHeight - 6);
        }

        const safeName = this.sanitizeFileName(taskName || '方案');
        const filename = `${safeName}-报告.pdf`;
        pdf.save(filename);
      } catch (e) {
        console.error('导出报告失败：', e);
        alert('导出报告失败，请重试');
      }
    },
    // 从本地获取当前任务名：currentDialogTask 或最近一个
    getCurrentTaskNameFallback() {
      try {
        const dialogTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
        const currentTask = localStorage.getItem('currentDialogTask');
        if (currentTask && dialogTasks.includes(currentTask)) return currentTask;
        if (dialogTasks.length > 0) return dialogTasks[dialogTasks.length - 1];
        return '';
      } catch (_) {
        return '';
      }
    },
    // 简单清理文件名非法字符
    sanitizeFileName(name) {
      return String(name).replace(/[\\/:*?"<>|\n\r]+/g, '_').trim() || '方案';
    },
    // 简单转义 HTML
    escapeHtml(str) {
      return String(str).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
    },
    async ensureRadarChartPrepared() {
      if (this.aiScores && this.aiScores.trim().length > 0 && !this.showRadarChart) {
        this.showRadarChart = true;
        this.showTask1Content = true;
        this.updateRadarData();
        await this.$nextTick();
        this.initCharts();
      } else if (this.showRadarChart) {
        // 尝试重新 resize 保证截图时尺寸正确
        try {
          const el = document.getElementById('2d-chart');
          if (el) {
            const inst = echarts.getInstanceByDom(el) || echarts.init(el);
            inst.resize();
          }
        } catch (_) {}
      }
    },
    goToNextStep() {
      this.$router.push({ name: 'Dialog' });
    }
  }
}
</script>

<style scoped>
@import '../utils/sidebar.css';

.visualization {
  display: flex;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 0;
  background: linear-gradient(135deg, #e0e7ff 0%, #f9f9f9 100%);
  border-radius: 0;
  box-shadow: none;
  min-height: 100vh;
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
  transform: translateX(2px);
}

.task-name {
  font-size: 0.95em;
  color: #ecf0f1;
  font-weight: 500;
  word-wrap: break-word;
  line-height: 1.4;
}

.main-content {
  flex: 1;
  margin-left: 0;
  padding: 20px;
}

.content {
  display: flex;
  justify-content: space-between;
}

.filters {
  flex: 1;
  max-width: 50%;
}

.markdown-output {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  font-family: 'Courier New', Courier, monospace;
  overflow-x: auto;
}

.markdown-output pre {
  background-color: #e9ecef;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.charts {
  flex: 1;
  max-width: 50%;
}

.chart {
  width: 100%;
  height: 400px;
}

.next-button {
  text-align: right;
  margin-top: 20px;
}

.next-button button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.next-button .outline {
  background: transparent;
  color: #007bff;
  border: 1px solid #007bff;
  margin-right: 10px;
}

.next-button button:hover {
  background-color: #0056b3;
}

.next-button .outline:hover {
  background-color: rgba(0, 123, 255, 0.06);
}

      .print-only {
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: 600px; /* 减小隐藏区域宽度以降低渲染分辨率 */
        background: #ffffff;
        padding: 10px;
      }/* 响应式设计 */
@media (max-width: 768px) {
  .visualization {
    flex-direction: column;
  }
  
  .main-content {
    padding: 15px;
  }
  
  .content {
    flex-direction: column;
    gap: 20px;
  }
  
  .filters,
  .charts {
    max-width: 100%;
  }
}
</style>