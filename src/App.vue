<template>
  <div id="app">
    <div class="container">
      <nav class="sidebar">
        <header class="header">
          <h1>欢迎使用元创平台</h1>
          <div class="header-line"></div>
        </header>
        <ul>
          <li><router-link to="/dialog">对话入口</router-link></li>
          <!-- <li><router-link to="/classic-entry">经典入口</router-link></li> -->
          <li><router-link to="/flowchart">流程图</router-link></li>
          <li><router-link to="/favorites">我的收藏</router-link></li>
          <li><button @click="showTaskTypePrompt">新建任务</button></li> <!-- 修改新建任务按钮 -->
          <div class="header-line"></div>
          <li v-for="(task, index) in tasks" :key="index" :class="{ 'task-item': true, 'active-task': task.active }" @click="navigateToTask(task, index)">{{ task.name }}</li>
        </ul>
        <router-link to="/" class="account-button">账户</router-link>
      </nav>
      <main class="content">
        <div class="steps-container">
          <el-steps :active="currentStep" finish-status="success" align-center>
            <el-step 
              title="需求收集" 
              description="AI智能对话"
              icon="ChatDotRound"
            />
            <el-step 
              title="模板生成" 
              description="结构化模板"
              icon="Document"
            />
            <el-step 
              title="任务管理" 
              description="三维分析"
              icon="Management"
            />
            <el-step 
              title="集成分析" 
              description="问题识别"
              icon="Search"
            />
            <el-step 
              title="结果对比" 
              description="方案生成"
              icon="Scale"
            />
            <el-step 
              title="模板选择" 
              description="方法对比"
              icon="Select"
            />
            <el-step 
              title="最终整合" 
              description="方案确定"
              icon="Finished"
            />
            <el-step 
              title="可视化评估" 
              description="效果评估"
              icon="PieChart"
            />
          </el-steps>
        </div>
        <router-view />
      </main>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { ElMessageBox } from 'element-plus';

export default defineComponent({
  name: 'App',
  data() {
    return {
      breadcrumbItems: [],
      tabs: ['检索文献', '可视化', '编辑入库'],
      entryClickCount: 0, // 初始化为0
      tasks: [], // 移除默认任务
      currentStep: 0, // 当前步骤
      stepRoutes: [
        '/dialog',           // 0: 需求收集
        '/template',         // 1: 模板生成  
        '/task-manager',     // 2: 任务管理
        '/newintegration',   // 3: 集成分析
        '/results',          // 4: 结果对比
        '/template-selection', // 5: 模板选择
        '/final-result',     // 6: 最终整合
        '/visualization'     // 7: 可视化评估
      ]
    };
  },
  computed: {
    // isClassicEntry 已移除
    isSearchHighlight() {
      const searchHighlightRoutes = [
        // 添加相关路由
      ];
      return searchHighlightRoutes.includes(this.$route.path);
    },
    isNewIntegration() {
      return this.$route.path === '/newintegration';
    },
    isVisualization() {
      return this.$route.path === '/visualization';
    },
    isTemplateOrFavoritesOrOthers() {
      const templateOrFavoritesOrOthersRoutes = [
        '/template-selection',
        '/favorites',
        '/increase-capacity',
        '/improve-training-efficiency',
        '/lidar-debate',
        '/results' // 添加 results 路由
      ];
      return templateOrFavoritesOrOthersRoutes.includes(this.$route.path);
    }
  },
  watch: {
    $route: {
      immediate: true,
      handler(to) {
        this.updateBreadcrumb(to);
        this.updateTaskNames();
        this.updateCurrentStep(to);
      }
    }
  },
  methods: {
    updateBreadcrumb(route) {
      const breadcrumbItems = [];
      let currentRoute = route;

      while (currentRoute) {
        breadcrumbItems.unshift({
          label: currentRoute.meta.breadcrumb || currentRoute.name,
          to: currentRoute.path !== this.$route.path ? currentRoute.path : null
        });
        const parentName = currentRoute.meta.parent;
        currentRoute = this.$router.resolve({ name: parentName }).route;
      }

      this.breadcrumbItems = breadcrumbItems;
    },
    showTaskTypePrompt() {
      ElMessageBox.confirm('请选择任务类型', '新建任务', {
        confirmButtonText: '对话入口',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        this.createTask('dialog');
        this.$router.push('/dialog'); // 跳转到对话入口
      });
    },
    createTask(entryType) {
      if (this.entryClickCount < 2) {
        this.entryClickCount += 1;
        const currentPageBreadcrumb = this.$route.meta.breadcrumb || '未知页面';
        const taskName = `任务${this.entryClickCount}(${currentPageBreadcrumb})`;
        const taskPath = '/dialog';
        this.tasks.push({ name: taskName, path: taskPath, active: true });
      }
    },
    navigateToTask(task, index) {
      // 重新启动点击的任务，并关闭其他任务
      const currentPageBreadcrumb = this.$route.meta.breadcrumb || '未知页面';
      this.tasks = this.tasks.map((t, i) => {
        if (i === index) {
          return { ...t, name: `任务${i + 1}(${currentPageBreadcrumb})`, active: true };
        } else {
          return { ...t, active: false };
        }
      });
      this.$router.push(task.path);
    },
    updateTaskNames() {
      const currentPageBreadcrumb = this.$route.meta.breadcrumb || '未知页面';
      if (this.tasks.length > 0) {
        const activeTaskIndex = this.tasks.findIndex(task => task.active);
        if (activeTaskIndex !== -1) {
          this.tasks[activeTaskIndex].name = `任务${activeTaskIndex + 1}(${currentPageBreadcrumb})`;
        }
      }
    },
    updateCurrentStep(route) {
      const routePath = route.path;
      const stepIndex = this.stepRoutes.findIndex(step => step === routePath);
      if (stepIndex !== -1) {
        this.currentStep = stepIndex;
      }
    }
  }
});
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.header {
  padding: 20px;
  color: #fff;
  font-size: 24px;
  text-align: center;
  position: relative;
  background: linear-gradient(90deg, #007bff 0%, #5a8cff 100%);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.10);
}

.header-line {
  height: 2px;
  background: linear-gradient(90deg, #42b983 0%, #007bff 100%);
  margin-top: 10px;
  border-radius: 1px;
}

.steps-container {
  padding: 20px;
  background: linear-gradient(135deg, #f8f9ff 0%, #e8f1ff 100%);
  border-bottom: 1px solid #e0e7ff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.steps-container :deep(.el-steps) {
  padding: 10px 0;
}

.steps-container :deep(.el-step__title) {
  font-size: 14px;
  font-weight: 600;
  color: #3b3b6d;
  line-height: 1.2;
}

.steps-container :deep(.el-step__description) {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.steps-container :deep(.el-step__head) {
  transition: transform 0.2s ease;
}

.steps-container :deep(.el-step__icon) {
  border-radius: 50%;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.steps-container :deep(.el-step.is-process .el-step__icon) {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-color: #3b82f6;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.steps-container :deep(.el-step.is-finish .el-step__icon) {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #10b981;
  color: white;
}

.steps-container :deep(.el-step.is-process .el-step__title) {
  color: #1d4ed8;
  font-weight: 700;
}

.steps-container :deep(.el-step.is-finish .el-step__title) {
  color: #059669;
  font-weight: 600;
}

.steps-container :deep(.el-step__line) {
  background: linear-gradient(90deg, #e2e8f0 0%, #cbd5e1 100%);
  height: 2px;
}

.steps-container :deep(.el-step.is-finish .el-step__line) {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.breadcrumb-container {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  background: #f9f9f9;
  border-bottom: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.07);
  margin-bottom: 20px;
  justify-content: space-between;
}

.breadcrumb-left {
  display: flex;
  align-items: center;
}

.breadcrumb-container h2 {
  margin: 0;
  font-size: 18px;
  color: #3b3b6d;
  font-weight: 700;
  letter-spacing: 1px;
}

.breadcrumb {
  margin-left: 10px;
}

.breadcrumb a {
  color: #42b983;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.breadcrumb a:hover {
  text-decoration: underline;
  color: #007bff;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 20px;
}

.vertical-line {
  height: 30px;
  width: 2px;
  background: linear-gradient(180deg, #007bff 0%, #42b983 100%);
  margin-right: 20px;
  border-radius: 1px;
}

.tab {
  padding: 10px 20px;
  background: #ecf0f1;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
  font-weight: 600;
  color: #3b3b6d;
  box-shadow: 0 1px 4px rgba(60, 60, 120, 0.04);
}

.tab:hover {
  transform: translateY(-2px) scale(1.03);
  background: #dcdcdc;
}

.tab.active {
  background: linear-gradient(90deg, #d4edda 0%, #b2f0e6 100%);
  color: #155724;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
}

.sidebar {
  width: 200px;
  background: linear-gradient(135deg, #2c3e50 60%, #3b3b6d 100%);
  padding: 20px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  box-shadow: 2px 0 8px rgba(60, 60, 120, 0.08);
}

.sidebar ul {
  list-style-type: none;
  padding: 0;
  margin-top: 10px;
}

.sidebar li {
  margin-bottom: 10px;
}

.sidebar a,
.sidebar button {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  padding: 10px;
  border-radius: 4px;
  text-decoration: none;
  display: block;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
}

.sidebar a:hover,
.sidebar button:hover {
  background: linear-gradient(90deg, #42b983 0%, #007bff 100%);
  color: #fff;
}

.task-item {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  padding: 10px;
  border-radius: 4px;
  text-decoration: none;
  display: block;
  margin-top: 10px;
  margin-bottom: 10px;
  transition: background 0.3s, transform 0.3s, color 0.2s;
  font-weight: 500;
}

.task-item:hover {
  background: linear-gradient(90deg, #42b983 0%, #007bff 100%);
  color: #fff;
  transform: translateY(-2px) scale(1.03);
}

.active-task {
  background: linear-gradient(90deg, #d4edda 0%, #b2f0e6 100%);
  color: #155724 !important;
  font-weight: 700;
}

.account-button {
  text-align: center;
  padding: 10px;
  background: linear-gradient(90deg, #42b983 0%, #007bff 100%);
  border-radius: 4px;
  text-decoration: none;
  color: #fff;
  margin-top: auto;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
  transition: background 0.2s;
}

.account-button:hover {
  background: linear-gradient(90deg, #007bff 0%, #42b983 100%);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #ecf0f1;
  padding: 20px;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

::-webkit-scrollbar {
  width: 8px;
  background: #e0e7ff;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb {
  background: #bfcfff;
  border-radius: 4px;
}
</style>