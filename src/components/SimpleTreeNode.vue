<template>
  <div class="tree-node-item">
    <div class="node-content" :class="levelClass" @click="toggleCollapse">
      <span class="node-icon">{{ getIcon() }}</span>
      <span class="node-name">{{ data.name }}</span>
      <span v-if="hasChildren" class="collapse-icon">
        {{ collapsed ? '▶' : '▼' }}
      </span>
    </div>
    
    <div v-if="!collapsed && hasChildren" class="children-container">
      <div 
        v-for="(child, index) in data.children" 
        :key="index" 
        class="child-branch"
      >
        <SimpleTreeNode :data="child" :level="level + 1" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SimpleTreeNode',
  props: {
    data: {
      type: Object,
      required: true
    },
    level: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      collapsed: false
    };
  },
  computed: {
    hasChildren() {
      return this.data.children && this.data.children.length > 0;
    },
    levelClass() {
      return `level-${Math.min(this.level, 3)}`;
    }
  },
  methods: {
    toggleCollapse() {
      if (this.hasChildren) {
        this.collapsed = !this.collapsed;
      }
    },
    getIcon() {
      if (this.level === 1) {
        // 阶段图标
        const iconMap = {
          '对话/需求': '💬',
          'AI内容': '🤖',
          '任务管理': '📋',
          '集成分析': '🔗',
          '结果方案': '💡',
          '可视化评估': '📊'
        };
        return iconMap[this.data.name] || '📁';
      }
      return '📄';
    }
  }
};
</script>

<style scoped>
.tree-node-item {
  margin: 4px 0;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.level-1 {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  color: white;
  font-weight: 500;
  margin: 6px 0;
}

.level-1:hover {
  background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
  transform: translateX(2px);
}

.level-2, .level-3 {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #495057;
}

.level-2:hover, .level-3:hover {
  background: #e9ecef;
  border-color: #ced4da;
}

.node-icon {
  margin-right: 8px;
  font-size: 14px;
}

.node-name {
  flex: 1;
  word-break: break-word;
  line-height: 1.4;
}

.collapse-icon {
  margin-left: 8px;
  font-size: 10px;
  opacity: 0.7;
}

.children-container {
  margin-left: 16px;
  border-left: 1px solid #dee2e6;
  padding-left: 12px;
  margin-top: 4px;
}

.child-branch {
  position: relative;
}

.child-branch::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 15px;
  width: 12px;
  height: 1px;
  background: #dee2e6;
}
</style>