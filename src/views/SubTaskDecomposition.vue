<template>
  <div class="sub-task-container">
    <header class="page-header">
      <h1>子任务拆解详情</h1>
      <div class="header-controls">
        <button class="back-btn" @click="$router.go(-1)">返回</button>
      </div>
    </header>

    <main class="main-content" v-loading="loading">
      <div v-if="!taskName" class="empty-state">
        <p>请先选择一个任务</p>
      </div>

      <div v-else class="content-wrapper">
        <div class="task-info">
          <h2>当前任务: {{ taskName }}</h2>
          <p class="task-meta">共 {{ subTasks.length }} 个子任务</p>
        </div>

        <div v-if="subTasks.length === 0" class="no-data">
          <p>暂无子任务拆解数据</p>
        </div>

        <div v-else class="sub-tasks-list">
          <div v-for="(task, index) in subTasks" :key="task.id" class="sub-task-card">
            <div class="card-header">
              <span class="task-index">#{{ index + 1 }}</span>
              <h3 class="task-title">{{ task.sub_task_name }}</h3>
              <span class="difficulty-badge" :class="task.difficulty">{{ task.difficulty }}</span>
            </div>
            
            <div class="card-body">
              <div class="description-section">
                <h4>任务描述</h4>
                <p>{{ task.description }}</p>
              </div>
              
              <div class="status-section">
                <span class="status-label">状态:</span>
                <span class="status-text" :class="task.status">{{ task.status === 'completed' ? '已完成' : '待处理' }}</span>
              </div>
            </div>
          </div>
        </div>

        <footer class="page-footer">
          <button class="continue-btn" @click="handleContinue">继续</button>
        </footer>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export default {
  name: 'SubTaskDecomposition',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const taskName = ref('');
    const subTasks = ref([]);
    const loading = ref(false);

    const loadSubTasks = async (name) => {
      if (!name) return;
      loading.value = true;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/sub-tasks/${encodeURIComponent(name)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            subTasks.value = data.subTasks || [];
          }
        }
      } catch (error) {
        console.error('加载子任务失败:', error);
      } finally {
        loading.value = false;
      }
    };

    const handleContinue = () => {
      if (taskName.value) {
        router.push({ name: 'NewIntegration', query: { taskName: taskName.value } });
      }
    };

    onMounted(() => {
      // 从路由参数或查询参数获取任务名
      const name = route.params.taskName || route.query.taskName;
      if (name) {
        taskName.value = name;
        loadSubTasks(name);
      }
    });

    return {
      taskName,
      subTasks,
      loading,
      handleContinue
    };
  }
};
</script>

<style scoped>
.sub-task-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.back-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background-color: #ecf5ff;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.task-info {
  margin-bottom: 20px;
}

.task-info h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.task-meta {
  color: #909399;
  font-size: 14px;
}

.sub-tasks-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.sub-task-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border-top: 4px solid #6610f2;
  transition: transform 0.3s;
}

.sub-task-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.task-index {
  font-size: 18px;
  font-weight: bold;
  color: #909399;
  margin-right: 12px;
}

.task-title {
  margin: 0;
  font-size: 18px;
  flex: 1;
  color: #303133;
}

.difficulty-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: uppercase;
}

.difficulty-badge.easy { background: #f0f9eb; color: #67c23a; }
.difficulty-badge.medium { background: #e6a23c20; color: #e6a23c; }
.difficulty-badge.hard { background: #fef0f0; color: #f56c6c; }

.description-section h4 {
  margin: 0 0 8px 0;
  color: #606266;
  font-size: 14px;
}

.description-section p {
  margin: 0 0 16px 0;
  color: #606266;
  line-height: 1.6;
  font-size: 14px;
}

.status-section {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.status-label {
  color: #909399;
  margin-right: 8px;
}

.status-text.completed { color: #67c23a; }
.status-text.pending { color: #e6a23c; }

.empty-state, .no-data {
  text-align: center;
  padding: 40px;
  color: #909399;
  background: white;
  border-radius: 8px;
}

.page-footer {
  margin-top: 32px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.continue-btn {
  background: #28a745;
  color: white;
  padding: 12px 48px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
}

.continue-btn:hover {
  background: #218838;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(40, 167, 69, 0.3);
}
</style>
