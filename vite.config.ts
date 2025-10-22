import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueSetupExtend from 'vite-plugin-vue-setup-extend'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VueSetupExtend()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api/save-content': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/update-content': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/register': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/login': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/conversations': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/ai-content': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/save-task-manager': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/update-task-manager': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/task-manager-content': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/save-integration-analysis': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/integration-analysis': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/save-results': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/results-solutions': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/template-selection': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/template-selection/save': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/final-result-expanded': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/final-result-expanded/save': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/combined-plan/stream': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/test': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // 统一走本地后端，由后端转发到上游模型服务并处理鉴权
      '/api/ai': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // 明确转发新增 AI/子任务/问题相关接口，避免 404
      '/api/ai/decompose-subtasks': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/ai/analyze-task-problems': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/sub-tasks': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/task-problems': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/save-visualization-assessment': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/update-visualization-assessment': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/visualization-assessments': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/dialog-tasks': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/dialog-messages': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // Task deletion and other task-related endpoints
      '/api/tasks': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      // Task plan endpoints (save/get/edit/versions)
      '/api/task-plan': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})