<template>
  <div class="lidar-debate">
    <h2>自动驾驶汽车的激光雷达是否必要</h2>
    <div class="content">
      <div class="section" v-for="(section, index) in sections" :key="index" @click="logClick(section.title)">
        <input type="checkbox" v-model="section.selected" @click.stop />
        <div class="section-content">
          <h3>{{ section.title }}</h3>
          <ul>
            <li v-for="(item, idx) in section.items" :key="idx">{{ item }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LidarDebate',
  data() {
    return {
      sections: [
        {
          title: '激光雷达的优点',
          selected: false,
          items: [
            '高精度和高分辨率：激光雷达能够精确地测量物体的距离和形状，生成实时的3D环境地图，使自动驾驶系统能够准确识别周围物体的位置、形状和动态变化。',
            '全天候能力：相比于摄像头，激光雷达不受光照变化（如黑暗、阴影）影响，能够在低光或无光的环境下正常工作。',
            '距离测量的准确性：激光雷达提供了非常高的距离精度，可以让车辆精准感知到前方的障碍物以及行驶路线。'
          ]
        },
        {
          title: '激光雷达的缺点',
          selected: false,
          items: [
            '成本高：激光雷达的硬件成本较高，这大大增加了自动驾驶汽车的整体成本，特别是在消费级市场中应用时。',
            '体积和外观：早期的激光雷达设备通常很大，需要安装在车顶，影响车辆的设计美观和空气动力学性能。不过，随着技术的发展，激光雷达的体积和外形已逐渐缩小。',
            '对恶劣天气的敏感性：虽然激光雷达能在低光条件下工作，但在雨雪、雾霾等恶劣天气下，激光信号可能会受到干扰，影响其性能。'
          ]
        },
        {
          title: '不使用激光雷达的替代方案',
          selected: false,
          items: [
            '摄像头：通过使用多个高分辨率摄像头，自动驾驶系统可以捕捉大量视觉信息，用于物体检测、识别、跟踪以及道路识别。',
            '雷达：雷达可以在恶劣天气条件下正常工作，能够提供关于物体距离、速度等信息，尤其擅长检测远距离物体。',
            '深度学习和神经网络：通过大规模数据训练的神经网络可以从摄像头捕捉到的2D信息中推断出3D环境信息，模拟激光雷达的功能。'
          ]
        },
        {
          title: '激光雷达是否必要的争论',
          selected: false,
          items: [
            '特斯拉的立场：特斯拉认为，自动驾驶的未来应该依赖摄像头、雷达和强大的AI软件，而不需要激光雷达。特斯拉的自动驾驶系统（Autopilot）主要依赖视觉感知。',
            'Waymo和其他厂商的立场：Waymo、百度Apollo等公司认为，激光雷达是实现全自动驾驶不可或缺的一部分。激光雷达提供的高精度和冗余数据能提升系统的安全性和可靠性。'
          ]
        },
        {
          title: '结论',
          selected: false,
          items: [
            '激光雷达是否必要取决于自动驾驶系统设计的目标和权衡：',
            '激光雷达有助于提高系统的精度和安全性，尤其是在高精度地图构建和恶劣条件下的感知能力方面。',
            '基于摄像头和雷达的系统依赖于强大的AI和数据处理能力，可以降低硬件成本，但在某些场景下可能不如激光雷达系统精确。',
            '目前自动驾驶行业尚无统一标准，不同公司选择了不同的技术路径。如果目标是实现更高阶的自动驾驶（L4或L5级别），激光雷达可能提供重要的感知能力补充。'
          ]
        }
      ]
    };
  },
  methods: {
    logClick(title) {
      console.log(`点击了: ${title}`);
    }
  }
};
</script>

<style scoped>
.lidar-debate {
  padding: 20px;
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

input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}
</style>