<template>
  <div class="content-ideas-generator">
    <main>
      <section class="main-area">
        <div class="goal-box">
          <input type="checkbox" id="objective-checkbox" />
          <label for="objective-checkbox">
            <h2>目标</h2>
            <p>生成一个包含50个独特内容创意的列表，专注于健康与保健领域的博客，关注流行话题和关键词</p>
            <p class="model-info">由 OpenAI_GPT-3.5 设计 — 快速</p>
            <p class="search-enabled">启用搜索</p>
          </label>
        </div>
      </section>
      <aside class="task-bar" :class="{ collapsed: isCollapsed }">
        <h2>任务</h2>
        <ul v-if="!isCollapsed">
          <li v-for="(task, index) in tasks" :key="index">
            <p>{{ task.name }} - {{ task.status }}</p>
          </li>
        </ul>
      </aside>
      <button class="toggle-button" @click="toggleTaskBar">
        {{ isCollapsed ? '<' : '>' }}
      </button>
    </main>
    <button class="thinking" @click="handleThinkingClick">思考中</button>
  </div>
</template>

<script>
export default {
  name: 'ContentIdeasGenerator',
  data() {
    return {
      isCollapsed: false,
      tasks: [
        { name: '任务一', status: '未开始' },
        { name: '任务二', status: '进行中' },
        { name: '任务三', status: '已完成' },
      ],
    };
  },
  methods: {
    handleButtonClick(event) {
      console.log(`${event.target.innerText} 按钮被点击`);
    },
    handleThinkingClick() {
      this.$router.push({ name: 'NewIntegration' });
    },
    toggleTaskBar() {
      this.isCollapsed = !this.isCollapsed;
    },
  },
};
</script>

<style scoped>
.content-ideas-generator {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f4f4f9;
  position: relative;
}

main {
  display: flex;
  flex: 1;
  position: relative;
}

.main-area {
  flex: 2;
  padding: 20px;
  border-right: 1px solid #ddd;
  background-color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.goal-box {
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  width: 100%;
  max-width: 600px;
}

.goal-box input[type="checkbox"] {
  margin-right: 10px;
  cursor: pointer;
}

.goal-box label {
  flex: 1;
}

.goal-box h2 {
  margin: 0 0 10px 0;
  font-size: 1.4em;
  color: #333;
}

.goal-box p {
  margin: 0;
  line-height: 1.5;
  color: #555;
}

.model-info, .search-enabled {
  margin-top: 10px;
  font-size: 0.9em;
  color: #777;
}

.task-bar {
  flex: 1;
  padding: 20px;
  background-color: #f9f9f9;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease;
}

.task-bar.collapsed {
  transform: translateX(100%);
}

.task-bar h2 {
  margin-top: 0;
  font-size: 1.4em;
  color: #333;
  cursor: pointer;
}

.task-bar ul {
  list-style-type: none;
  padding: 0;
  width: 100%;
}

.task-bar li {
  margin-bottom: 10px;
  font-size: 1em;
  color: #333;
  text-align: left;
}

.thinking {
  width: calc(100% - 40px);
  max-width: 600px;
  margin: 20px;
  background-color: green;
  color: white;
  padding: 15px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease;
  align-self: center;
}

.thinking:hover {
  background-color: darkgreen;
}

.toggle-button {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background-color: #ddd;
  border: none;
  padding: 10px;
  cursor: pointer;
  font-size: 1.2em;
  transition: background-color 0.3s ease;
}

.toggle-button:hover {
  background-color: #ccc;
}
</style>