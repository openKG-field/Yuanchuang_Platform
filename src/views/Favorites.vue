<template>
  <div class="favorites">
    <h2>您的收藏</h2>
    <div class="buttons">
      <div
        class="button-item"
        v-for="(item, index) in items"
        :key="index"
        @click="toggleDetail(index)"
        :style="{ cursor: 'pointer' }"
      >
        <div class="button-content">
          <h3>{{ item.label }}</h3>
          <div v-if="expandedIndex === index">
            <vue-markdown-it :source="item.description" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import VueMarkdownIt from 'vue3-markdown-it';
export default {
  name: 'Favorites',
  components: { VueMarkdownIt },
  data() {
    return {
      items: [],
      expandedIndex: null // 当前展开的索引
    };
  },
  created() {
    // 页面加载时直接读取路由参数并显示
    const newTitle = this.$route.query.newTitle;
    const newContent = this.$route.query.newContent;
    if (newTitle && newContent) {
      this.items = [{
        label: newTitle,
        description: newContent
      }];
    }
  },
  watch: {
    // 如果页面未刷新直接跳转也能响应
    '$route.query.newTitle'(newTitle) {
      const newContent = this.$route.query.newContent;
      if (newTitle && newContent) {
        this.items = [{
          label: newTitle,
          description: newContent
        }];
      }
    }
  },
  methods: {
    toggleDetail(index) {
      this.expandedIndex = this.expandedIndex === index ? null : index;
    }
  }
};
</script>

<style scoped>
.favorites {
  padding: 40px 20px 20px 20px;
  text-align: left;
  background: linear-gradient(135deg, #e0e7ff 0%, #f9f9f9 100%);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(60, 60, 120, 0.08);
  max-width: 800px;
  margin: 40px auto 0 auto;
}

h2 {
  margin-bottom: 32px;
  font-size: 2rem;
  color: #3b3b6d;
  letter-spacing: 2px;
  font-weight: 700;
  text-align: left;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
  align-items: stretch;
}

.button-item {
  width: 100%;
  max-width: 600px;
  background: #fff;
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
  padding: 24px 32px;
  transition: box-shadow 0.3s, transform 0.2s;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  position: relative;
}

.button-item:hover {
  box-shadow: 0 6px 24px rgba(60, 60, 120, 0.18);
  transform: translateY(-2px) scale(1.01);
  background: linear-gradient(90deg, #f0f4ff 0%, #fff 100%);
}

.button-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}

.button-content h3 {
  margin: 0 0 10px 0;
  font-size: 1.25rem;
  color: #2d3a4b;
  font-weight: 600;
  letter-spacing: 1px;
  text-align: left;
}

.button-content p,
.button-content :deep(p) {
  margin: 0;
  font-size: 1rem;
  color: #5a5a89;
  line-height: 1.7;
  word-break: break-all;
  white-space: pre-line;
  text-align: left;
  width: 100%;
}
</style>