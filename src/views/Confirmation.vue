<template>
  <div class="confirmation-container">
    <h2>欢迎使用经典入口</h2>
    <p class="message">
      你想要用 {{ searchMethod }} 的方式，搜索 {{ country }} 的 {{ direction }} 的内容是吗？
    </p>
    <div class="buttons">
      <button @click="confirm(true)">是</button>
      <button @click="confirm(false)">否</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "Confirmation",
  props: {
    country: String,
    searchMethod: String,
    direction: String,
  },
  methods: {
    confirm(isYes) {
      if (isYes) {
        alert("你选择了 '是'。");
        // 在这里处理“是”的逻辑
      } else {
        alert("你选择了 '否'。");
        // 在这里处理“否”的逻辑，例如返回上一页或重新选择
        this.$router.push('/classic'); // 示例：返回经典入口
      }
    },
  },
};
</script>

<style scoped>
.confirmation-container {
  max-width: 600px;
  margin: 100px auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  text-align: center;
}

h2 {
  margin-bottom: 20px;
}

.message {
  font-size: 18px;
  margin-bottom: 30px;
}

.buttons button {
  padding: 10px 20px;
  margin: 0 10px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.buttons button:hover {
  background-color: #3a9b72;
}
</style>