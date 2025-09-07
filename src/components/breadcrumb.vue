<template>
  <el-breadcrumb separator="/">
    <el-breadcrumb-item v-for="(item, index) in breadcrumbItems" :key="index" :to="item.to">
      <a v-if="item.to" :href="item.to">{{ item.label }}</a>
      <span v-else>{{ item.label }}</span>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script>
export default {
  data() {
    return {
      breadcrumbItems: []
    };
  },
  watch: {
    $route: {
      immediate: true,
      handler(to) {
        this.updateBreadcrumb(to);
      }
    }
  },
  methods: {
    updateBreadcrumb(route) {
      const matchedRoutes = route.matched;
      const breadcrumbItems = [];

      matchedRoutes.forEach(route => {
        breadcrumbItems.push({
          label: route.meta.breadcrumb || route.name,
          to: route.path !== this.$route.path ? route.path : null
        });
      });

      this.breadcrumbItems = breadcrumbItems;
    }
  }
};
</script>