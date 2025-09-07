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
      '/api/ai': {
        target: 'https://openai.qiniu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/v1/chat/completions')
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