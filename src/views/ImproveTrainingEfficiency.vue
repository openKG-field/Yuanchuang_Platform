<template>
  <div class="improve-training-efficiency">
    <h2>提高大模型训练效率</h2>
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
  name: 'ImproveTrainingEfficiency',
  data() {
    return {
      sections: [
        {
          title: '1. 硬件加速',
          selected: false,
          items: [
            '使用GPU或TPU：相比于CPU，GPU和TPU（Tensor Processing Unit）在并行计算和矩阵运算方面有更高的效率，是加速深度学习模型训练的关键硬件。',
            '分布式训练：将模型训练任务分配到多个计算节点上进行并行训练，可以显著缩短训练时间。框架如TensorFlow、PyTorch都支持分布式训练。',
            '混合精度训练：使用FP16（半精度浮点数）进行计算，可以大幅度提高计算效率，同时减少显存占用。在不影响精度的前提下，使用较低的精度来加快训练速度。'
          ]
        },
        {
          title: '2. 优化算法和模型结构',
          selected: false,
          items: [
            '优化器选择：一些优化器（如Adam、RMSProp）能加快模型收敛速度，而SGD通常在大数据集上收敛较慢。选择适当的优化器可以提升效率。',
            '梯度裁剪与正则化：在大模型训练中，梯度爆炸和梯度消失是常见问题。通过梯度裁剪和合适的正则化方法，可以使模型训练更稳定，从而减少训练迭代次数。',
            '模型压缩：通过剪枝（pruning）、量化（quantization）等技术，减少模型的参数规模，降低训练计算量。',
            '智能初始化：使用良好的参数初始化方法（如He或Xavier初始化）可以帮助模型更快收敛，减少训练迭代次数。'
          ]
        },
        {
          title: '3. 数据优化',
          selected: false,
          items: [
            '小批量训练（Mini-batch Training）：通过将数据分成多个小批量进行训练，可以提高GPU/TPU的并行效率，同时有效利用内存资源。',
            '数据增强：在不增加数据量的前提下，通过数据增强（Data Augmentation）提升模型的泛化能力，减少过拟合现象，进而减少需要的训练次数。',
            '预处理和缓存数据：使用高效的I/O操作将训练数据预先处理并缓存，以减少数据加载时间。'
          ]
        },
        {
          title: '4. 调整学习率',
          selected: false,
          items: [
            '学习率调度器：使用学习率调度器动态调整学习率，在训练的不同阶段使用不同的学习率（如初期较高、后期较低）能加速训练。',
            '循环学习率：通过使用周期性变化的学习率，模型可以在局部最优解之间跳跃，帮助加快收敛速度。'
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
.improve-training-efficiency {
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