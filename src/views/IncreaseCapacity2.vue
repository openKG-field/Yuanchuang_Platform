<template>
  <div class="increase-capacity">
    <h2>提高机器容量</h2>
    <div class="content">
      <div class="section" v-for="(section, index) in sections" :key="index" @click="logClick(section.title)">
        <div class="section-content">
          <h3>{{ section.title }}</h3>
          <ul>
            <li v-for="(item, idx) in section.items" :key="idx">{{ item }}</li>
          </ul>
        </div>
      </div>
    </div>
    <div class="favorite-button">
      <button @click="addToFavorites">添加到我的收藏</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'IncreaseCapacity',
  data() {
    return {
      sections: [
        {
          title: '1. 提升计算能力',
          items: [
            '升级处理器（CPU）：使用性能更高的多核处理器能显著提升机器的运算能力。',
            '增加内存（RAM）：内存容量的增加可以提升系统的多任务处理能力，尤其在处理大型数据集或并行任务时。',
            '升级显卡（GPU）：对于需要大量图形处理或深度学习任务的应用，升级到更高性能的GPU能显著提高运算速度。'
          ]
        },
        {
          title: '2. 增加存储容量',
          items: [
            '更大硬盘：如果存储容量不够，可以增加或更换更大容量的硬盘。固态硬盘（SSD）相较于传统硬盘（HDD），读写速度更快。',
            '使用外部存储：通过网络附加存储（NAS）或云存储服务，能扩展存储容量并提高数据存取的灵活性。'
          ]
        },
        {
          title: '3. 优化性能',
          items: [
            '系统优化：定期清理不必要的文件，删除无用软件，优化操作系统的设置，可以释放更多内存和处理能力。',
            '使用虚拟化技术：通过虚拟化或容器化技术（如Docker、Kubernetes），可以更有效地管理资源，优化系统性能。',
            '并行计算：在任务允许的情况下，通过并行计算或分布式计算，可以将任务分解到多个计算节点上，提高整体性能。'
          ]
        },
        {
          title: '4. 扩展网络能力',
          items: [
            '优化带宽：在处理大量网络流量时，确保足够的网络带宽，并使用快速网络协议（如千兆以太网或光纤）来提升传输速度。',
            '负载均衡：如果多台机器在工作，可以通过负载均衡器来分配任务，提升整体效率。'
          ]
        }
      ]
    };
  },
  methods: {
    logClick(title) {
      console.log(`点击了: ${title}`);
    },
    addToFavorites() {
      console.log('添加到我的收藏');
      alert('收藏成功');
    }
  }
};
</script>

<style scoped>
.increase-capacity {
  padding: 20px;
  position: relative;
}

.section {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  transition: transform 0.2s, background-color 0.2s;
  cursor: pointer;
}

.section:hover {
  transform: translateY(-5px);
  background-color: #f0f8ff;
}

.section-content {
  margin-left: 10px;
}

h3 {
  margin-top: 0;
}

.favorite-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
}

.favorite-button button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.favorite-button button:hover {
  background-color: #0056b3;
}
</style>