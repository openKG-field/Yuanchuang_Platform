<template>
  <div class="integration-container">
    <a-button type="primary" @click="navigateTo('https://scholar.google.com')" class="integration-button">Google学术</a-button>
    <a-button type="primary" @click="navigateTo('https://wenku.baidu.com')" class="integration-button">百度文库</a-button>
    <a-button type="primary" @click="navigateTo('https://write.qq.com/')" class="integration-button">作家</a-button>
    <a-button type="primary" @click="navigateTo('https://www.ysjf.com/index')" class="integration-button">导演</a-button>
    <a-button type="primary" class="integration-button">Python编程小助手</a-button>
    <a-button type="primary" @click="navigateTo('https://chatgpt.com/')" class="integration-button">chatgpt</a-button>
  </div>
</template>

<script>
export default {
  name: "Integration",
  methods: {
    navigateTo(url) {
      window.open(url, '_blank');
    }
  }
};
</script>

<style scoped>
.integration-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f0f2f5;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.integration-button {
  margin: 10px;
  width: 240px; /* 稍微扩大按钮 */
  font-size: 20px;
  font-weight: bold;
  transition: all 0.3s ease;
  background-color: #42b983;
  border: 2px solid #42b983;
  color: white;
  border-radius: 8px; /* 柔滑按钮的四角 */
}

.integration-button:hover {
  background-color: #42b983;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>

