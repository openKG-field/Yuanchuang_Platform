<template>
  <div class="simple-tree">
    <div class="tree-node" v-if="data">
      <div class="node-content root-node" @click="toggleCollapse">
        <span class="node-icon">🌲</span>
        <span class="node-name">{{ data.name }}</span>
        <span v-if="data.children && data.children.length" class="collapse-icon">
          {{ collapsed ? '▶' : '▼' }}
        </span>
      </div>
      
      <div v-if="!collapsed && data.children && data.children.length" class="children-container">
        <div 
          v-for="(child, index) in data.children" 
          :key="index" 
          class="child-branch"
        >
          <SimpleTreeNode :data="child" :level="1" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SimpleTreeNode from './SimpleTreeNode.vue';

export default {
  name: 'SimpleTreeChart',
  components: { SimpleTreeNode },
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      collapsed: false
    };
  },
  methods: {
    toggleCollapse() {
      if (this.data.children && this.data.children.length) {
        this.collapsed = !this.collapsed;
      }
    }
  }
};
</script>

<style scoped>
.simple-tree {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
}

.tree-node {
  margin: 8px 0;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.root-node {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.root-node:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

.node-icon {
  margin-right: 8px;
  font-size: 16px;
}

.node-name {
  flex: 1;
  word-break: break-word;
}

.collapse-icon {
  margin-left: 8px;
  font-size: 12px;
  opacity: 0.8;
}

.children-container {
  margin-left: 24px;
  border-left: 2px solid #e1e8ed;
  padding-left: 16px;
  margin-top: 8px;
}

.child-branch {
  position: relative;
}

.child-branch::before {
  content: '';
  position: absolute;
  left: -18px;
  top: 20px;
  width: 16px;
  height: 1px;
  background: #e1e8ed;
}
</style>