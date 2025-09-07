<template>
  <div class="classic-container">
    <div class="section">
      <h3>选择你的国家</h3>
      <ul class="options">
        <li><button @click="selectOption('中国', 'country')">中国</button></li>
        <li><button @click="selectOption('美国', 'country')">美国</button></li>
        <li><button @click="selectOption('日本', 'country')">日本</button></li>
        <li><button @click="selectOption('韩国', 'country')">韩国</button></li>
      </ul>
    </div>

    <div class="section">
      <h3>选择你的检索方式</h3>
      <ul class="options">
        <li><button @click="selectOption('图像', 'searchMethod')">图像</button></li>
        <li><button @click="selectOption('音乐', 'searchMethod')">音乐</button></li>
        <li><button @click="selectOption('文字', 'searchMethod')">文字</button></li>
        <li><button @click="selectOption('语音', 'searchMethod')">语音</button></li>
      </ul>
    </div>

    <div class="section">
      <h3>选择你想做的方向</h3>
      <ul class="options">
        <li><button @click="selectOption('文科', 'direction')">文科</button></li>
        <li><button @click="selectOption('理科', 'direction')">理科</button></li>
        <li><button @click="selectOption('结合', 'direction')">结合</button></li>
      </ul>
    </div>

    <!-- 右下角的继续按钮 -->
    <div class="continue-button">
      <button @click="continueSelection">继续</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "Classic",
  data() {
    return {
      selectedCountry: '',
      selectedSearchMethod: '',
      selectedDirection: '',
    };
  },
  methods: {
    selectOption(option, type) {
      console.log(`Selected ${type}: ${option}`);
      if (type === 'country') {
        this.selectedCountry = option;
      } else if (type === 'searchMethod') {
        this.selectedSearchMethod = option;
      } else if (type === 'direction') {
        this.selectedDirection = option;
      }
    },
    continueSelection() {
      console.log('Continuing with selection:', {
        country: this.selectedCountry,
        searchMethod: this.selectedSearchMethod,
        direction: this.selectedDirection
      });
      this.$router.push({
        name: 'Visualization',
        query: {
          country: this.selectedCountry,
          searchMethod: this.selectedSearchMethod,
          direction: this.selectedDirection
        }
      });
    }
  }
};
</script>

<style scoped>
.classic-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section {
  margin-bottom: 20px;
}

.section h3 {
  margin-bottom: 10px;
  color: #333;
}

.options {
  list-style-type: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
}

.options li {
  margin: 5px;
}

.options button {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.options button:hover {
  background-color: #3a9b72;
}

.continue-button {
  text-align: right;
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
</style>
