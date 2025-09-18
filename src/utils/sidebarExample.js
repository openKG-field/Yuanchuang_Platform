/**
 * 侧栏使用示例
 * 展示如何在其他 Vue 组件中使用可复用的侧栏功能
 */

// 1. 在组件中引入
import { useSidebar } from '@/utils/sidebarMixin';

// 2. 在 setup() 中使用
export default {
  name: 'ExampleComponent',
  setup() {
    const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useSidebar();
    
    return {
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed
    };
  }
};

// 3. 在模板中使用
// <template>
//   <div class="example-layout">
//     <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
//       <button class="sidebar-toggle" @click="toggleSidebar">
//         <span class="toggle-icon">{{ sidebarCollapsed ? '▶' : '◀' }}</span>
//       </button>
//       
//       <div class="sidebar-content" v-show="!sidebarCollapsed">
//         <h3>自定义标题</h3>
//         <!-- 自定义内容 -->
//       </div>
//     </aside>
//     
//     <main class="main-content">
//       <!-- 主要内容 -->
//     </main>
//   </div>
// </template>

// 4. 在样式中引入
// <style scoped>
// @import '../utils/sidebar.css';
// 
// .example-layout {
//   display: flex;
//   /* 其他自定义样式 */
// }
// </style>