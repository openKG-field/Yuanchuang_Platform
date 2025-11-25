import { createRouter, createWebHistory } from "vue-router";
import Dialog from '../views/Dialog.vue';
import Classic from '../views/Classic.vue';
import Login from '@/views/Login.vue';
import Results from "@/views/Results.vue";
import Integration from "@/views/Integration.vue";
import Template from '@/views/Template.vue'; 
import TaskManager from '@/views/TaskManager.vue';
import ContentIdeasGenerator from '../views/ContentIdeasGenerator.vue';
import Visualization from '@/views/Visualization.vue';
import TemplateSelection from '@/views/TemplateSelection.vue';
import AnnotationReport from '@/views/AnnotationReport.vue';
import Writing from '@/views/Writing.vue';
import NextPage from '@/views/NextPage.vue';
import NewIntegration from '@/views/NewIntegration.vue';
import FinalResult from '@/views/FinalResult.vue'; // 导入 FinalResult.vue
import ExecutablePlan from '@/views/ExecutablePlan.vue'; // 新增：可执行技术方案页面
import Flowchart from '@/views/Flowchart.vue'; // 导入流程图组件
import { Breadcrumb } from "ant-design-vue";
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

const routes = [
  {
    path: '/',
    name: '首页',
    component: Login,
    meta: { breadcrumb: '首页' }
  },
  {
    path: '/dialog',
    name: 'Dialog',
    component: Dialog,
    meta: { breadcrumb: '对话入口', parent: '首页' }
  },
  {
    path: '/executable-plan',
    name: 'ExecutablePlan',
    component: ExecutablePlan,
    meta: { breadcrumb: '实施方案', parent: '首页' }
  },
  {
    path: '/flowchart',
    name: 'Flowchart',
    component: Flowchart,
    meta: { breadcrumb: '流程图', parent: '首页' }
  },
  {
    path: '/classic',
    name: 'Classic',
    component: Classic,
    meta: { breadcrumb: 'Classic', parent: '首页' }
  },
  {
    path: '/results',
    name: 'Results',
    component: Results,
    meta: { breadcrumb: '结果', parent: '首页' }
  },
  {
    path: '/integration',
    name: 'Integration',
    component: Integration,
    meta: { breadcrumb: 'Integration', parent: '首页' }
  },
  {
    path: '/template',
    name: 'Template',
    component: Template,
    meta: { breadcrumb: '模板检索', parent: '首页' }
  },
  {
    path: '/task-manager',
    name: 'TaskManager',
    component: TaskManager,
    meta: { breadcrumb: '模板管理', parent: '首页' }
  },
  {
    path: '/content-ideas-generator',
    name: 'ContentIdeasGenerator',
    component: ContentIdeasGenerator,
    meta: { breadcrumb: '选择模板', parent: '首页' }
  },
  // 经典入口路由已移除
  {
    path: '/visualization',
    name: 'Visualization',
    component: Visualization,
    meta: { breadcrumb: '可视化', parent: '首页' }
  },
  {
    path: '/template-selection',
    name: 'TemplateSelection',
    component: TemplateSelection,
    meta: { breadcrumb: '模板选择', parent: '首页' }
  },
  {
    path: '/annotation-report',
    name: 'AnnotationReport',
    component: AnnotationReport,
    meta: { breadcrumb: 'AnnotationReport', parent: '首页' }
  },
  {
    path: '/writing',
    name: 'Writing',
    component: Writing,
    meta: { breadcrumb: 'Writing', parent: '首页' }
  },
  {
    path: '/next-page',
    name: 'NextPage',
    component: NextPage,
    meta: { breadcrumb: 'NextPage', parent: '首页' }
  },
  {
    path: '/increase-capacity',
    name: 'IncreaseCapacity',
    component: () => import('../views/IncreaseCapacity.vue'),
    meta: { breadcrumb: 'IncreaseCapacity', parent: '首页' }
  },
  {
    path: '/improve-training-efficiency',
    name: 'ImproveTrainingEfficiency',
    component: () => import('../views/ImproveTrainingEfficiency.vue'),
    meta: { breadcrumb: 'ImproveTrainingEfficiency', parent: '首页' }
  },
  {
    path: '/lidar-debate',
    name: 'LidarDebate',
    component: () => import('../views/LidarDebate.vue'),
    meta: { breadcrumb: 'LidarDebate', parent: '首页' }
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('../views/Favorites.vue'),
    meta: { breadcrumb: '收藏', parent: '首页' }
  },
  {
    path: '/newintegration',
    name: 'NewIntegration',
    component: NewIntegration,
    meta: { breadcrumb: '检索文献', parent: '首页' }
  },
  {
    path: '/final-result',
    name: 'FinalResult',
    component: FinalResult,
    meta: { breadcrumb: '最终结果', parent: '首页' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;