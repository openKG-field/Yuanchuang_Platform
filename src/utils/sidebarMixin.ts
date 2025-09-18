import { ref, reactive } from 'vue';

/**
 * 侧栏状态管理 Composable
 * 提供侧栏展开/收起功能
 */
export function useSidebar() {
  // 侧栏是否收起状态
  const sidebarCollapsed = ref(false);

  /**
   * 切换侧栏展开/收起状态
   */
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  };

  /**
   * 设置侧栏状态
   * @param collapsed 是否收起
   */
  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed;
  };

  return {
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed
  };
}

/**
 * 侧栏样式类名
 */
export const sidebarClasses = {
  sidebar: 'sidebar',
  sidebarCollapsed: 'collapsed',
  sidebarToggle: 'sidebar-toggle',
  sidebarContent: 'sidebar-content',
  toggleIcon: 'toggle-icon'
};

/**
 * 侧栏样式配置
 */
export const sidebarStyles = `
/* 侧栏样式 */
.sidebar {
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

.sidebar.collapsed {
  width: 60px;
  padding: 20px 8px;
  align-items: center;
}

.sidebar-toggle {
  position: absolute;
  top: 12px;
  right: -14px;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.toggle-icon { 
  font-size: 12px; 
}

.sidebar-content { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
}

/* 响应式侧栏 */
@media (max-width: 768px) {
  .sidebar { 
    width: 100%; 
    border-radius: 8px; 
  }
  .sidebar.collapsed { 
    width: 100%; 
  }
}
`;

/**
 * 侧栏模板字符串生成器
 * @param title 侧栏标题
 * @param contentSlot 内容插槽
 * @returns 侧栏模板字符串
 */
export const generateSidebarTemplate = (title: string, contentSlot: string = '') => `
<aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
  <button class="sidebar-toggle" @click="toggleSidebar">
    <span class="toggle-icon">{{ sidebarCollapsed ? '▶' : '◀' }}</span>
  </button>

  <div class="sidebar-content" v-show="!sidebarCollapsed">
    <h3>${title}</h3>
    ${contentSlot}
  </div>
</aside>
`;