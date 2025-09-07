<template>
  <div class="next-page">
    <aside class="sidebar">
      <h2>AI助手</h2>
      <ul class="nav-buttons">
        <li v-for="(button, index) in buttons" :key="button.name">
          <button v-if="showButtons" @click="handleButtonClick(button.name)">
            {{ button.label }}
          </button>
        </li>
      </ul>
    </aside>
    <section class="content-area">
      <h3>问题导向任务：执行中</h3>
      <div class="button-container">
        <button class="large-button" @click="handleButtonClick('检索')">检索</button>
        <button class="large-button" @click="handleButtonClick('可视化')">可视化</button>
      </div>
      <div class="continue-button">
        <button @click="goToClassic">下一步</button>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: "NextPage",
  data() {
    return {
      buttons: [
        { name: '检索文献', label: '检索文献' },
        { name: '创新范式', label: '创新范式' },
        { name: '再检索', label: '再检索' },
        { name: '可视化', label: '可视化' },
        { name: '编辑入库', label: '编辑入库' }
      ],
      showButtons: false
    };
  },
  mounted() {
    this.showButtons = true;
  },
  methods: {
    handleButtonClick(buttonName) {
      console.log(`点击了按钮: ${buttonName}`);
      if (buttonName === '检索文献') {
        this.$router.push({ name: 'NewIntegration' });
      } else if (buttonName === '创新范式') {
        this.$router.push({ name: 'ClassicEntry' });
      } else if (buttonName === '可视化') {
        this.$router.push({ name: 'Visualization' });
      } else if (buttonName === '再检索') {
        this.$router.push({ name: 'Dialog' });
      } else if (buttonName === '编辑入库') {
        this.$router.push({ name: 'Favorites' });
      }
    },
    goToClassic() {
      this.$router.push({ name: 'Classic' });
    }
  }
};
</script>

<style scoped>
.next-page {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 200px;
  background-color: #34495e;
  color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sidebar h2 {
  margin-bottom: 20px;
}

.nav-buttons {
  list-style-type: none;
  padding: 0;
  width: 100%;
}

.nav-buttons li {
  margin-bottom: 10px;
  width: 100%;
}

.nav-buttons button {
  width: 100%;
  padding: 10px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  opacity: 0;
  animation: fadeIn 0.5s forwards;
}

.nav-buttons button:hover {
  background-color: #3a9b72;
}

.content-area {
  flex: 1;
  padding: 20px;
  background-color: #f9f9f9;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative; /* 添加相对定位 */
}

.content-area h3 {
  margin-bottom: 20px;
}

.button-container {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.large-button {
  padding: 20px 40px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
}

.large-button:hover {
  background-color: #0056b3;
}

.continue-button {
  position: absolute; /* 使用绝对定位 */
  bottom: 20px; /* 距离底部20px */
  right: 20px; /* 距离右侧20px */
}

.continue-button button {
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.continue-button button:hover {
  background-color: #218838;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

.fade-enter-active {
  animation: fadeIn 0.5s forwards;
}

.fade-leave-active {
  animation: fadeOut 0.5s forwards;
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}
</style>