<template>
  <div class="flowchart-container">
    <!-- 左侧边栏 -->
    <aside class="sidebar" :class="{ 'collapsed': sidebarCollapsed }">
      <!-- 收起/展开按钮 -->
      <button class="sidebar-toggle" @click="toggleSidebar">
        <span class="toggle-icon">{{ sidebarCollapsed ? '▶' : '◀' }}</span>
      </button>
      
      <div class="sidebar-content" v-show="!sidebarCollapsed">
        <h3>任务列表</h3>
        <div class="task-stats">
          <p>任务总数: <span class="count">{{ uniqueTasks.length }}</span></p>
        </div>
        <ul class="task-list">
          <li 
            v-for="(task, index) in uniqueTasks" 
            :key="index" 
            class="task-item"
            :class="{ 'active': selectedTask === task.name }"
            @click="selectTask(task.name)"
          >
            <div class="task-name-section">
              <span class="task-name">{{ task.name }}</span>
              <div class="task-counts">
                <span class="count-item">对话: {{ task.conversationCount }}</span>
                <span class="count-item">内容: {{ task.aiContentCount }}</span>
                <span class="count-item">任务: {{ task.taskManagerCount }}</span>
                <span class="count-item">分析: {{ task.integrationAnalysisCount }}</span>
              </div>
            </div>
            <span class="task-count">{{ task.totalCount }}</span>
          </li>
        </ul>
        <div class="spacer"></div>
        <button @click="refreshData" :disabled="loading" class="refresh-btn">
          {{ loading ? '加载中...' : '刷新数据' }}
        </button>
      </div>
    </aside>
    
    <!-- 主要内容区域 -->
    <main class="main-content">
      <div class="header">
        <h1>{{ selectedTask ? `${selectedTask} - 操作流程` : 'AI操作流程展示' }}</h1>
        <p>{{ selectedTask ? 'Task Operation Process' : 'AI Operation Process Display' }}</p>
      </div>
      
      <div class="controls">
        <div class="stats">
          <span>{{ getStatusText() }}</span>
        </div>
        <div class="control-buttons">
          <button 
            v-if="selectedTask" 
            @click="showAllTasks" 
            class="show-all-btn"
          >
            显示所有任务
          </button>
        </div>
      </div>

      <div class="content">
        <div v-if="loading" class="loading-indicator">
          <div class="spinner"></div>
          <p>正在加载对话记录...</p>
        </div>
        
        <div v-else-if="conversations.length === 0 && aiContents.length === 0 && taskManagerContents.length === 0 && integrationAnalysis.length === 0 && resultsSolutions.length === 0 && visualizationAssessments.length === 0" class="empty-state">
          <p>暂无操作流程记录</p>
          <p>开始使用AI对话和内容生成功能后，操作流程将在这里展示</p>
        </div>
        
        <div v-else class="flowchart-canvas">
          <!-- 节点图容器 -->
          <div class="node-graph-container" ref="nodeContainer">
            <!-- 状态信息面板 -->
            <div class="status-overlay">
              <h4>📊 流程图状态</h4>
              <div class="status-grid">
                <div class="status-item">
                  <span class="status-label">节点总数:</span>
                  <span class="status-value">{{ nodes.length }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">连接线:</span>
                  <span class="status-value">{{ connections.length }}条</span>
                </div>
                <div class="status-item">
                  <span class="status-label">对话记录:</span>
                  <span class="status-value">{{ conversations.length }}条</span>
                </div>
                <div class="status-item">
                  <span class="status-label">AI内容:</span>
                  <span class="status-value">{{ aiContents.length }}条</span>
                </div>
                <div class="status-item">
                  <span class="status-label">任务管理:</span>
                  <span class="status-value">{{ taskManagerContents.length }}条</span>
                </div>
                <div class="status-item">
                  <span class="status-label">整合分析:</span>
                  <span class="status-value">{{ integrationAnalysis.length }}条</span>
                </div>
                <div class="status-item">
                  <span class="status-label">结果方案:</span>
                  <span class="status-value">{{ resultsSolutions.length }}条</span>
                </div>
                <div class="status-item">
                  <span class="status-label">可视化评估:</span>
                  <span class="status-value">{{ visualizationAssessments.length }}条</span>
                </div>
                <div class="status-item">
                  <span class="status-label">当前任务:</span>
                  <span class="status-value">{{ selectedTask || '全部' }}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">画布尺寸:</span>
                  <span class="status-value">{{ canvasWidth }}×{{ canvasHeight }}</span>
                </div>
              </div>
              
              <div class="operation-tips">
                <h5>🎯 操作指南</h5>
                <ul>
                  <li>点击节点内容跳转到相应页面</li>
                  <li>拖拽节点移动位置</li>
                  <li>拖拽蓝色圆点调整大小</li>
                  <li>点击左侧任务过滤内容</li>
                  <li>点击复制按钮复制内容</li>
                </ul>
              </div>
            </div>
            
            <!-- SVG箭头连接线 -->
            <svg class="connection-svg" :width="canvasWidth" :height="canvasHeight">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ff8c00" />
                </marker>
              </defs>
              <path 
                v-for="(connection, index) in connections" 
                :key="index"
                :d="connection.path"
                stroke="#ff8c00"
                stroke-width="3"
                fill="none"
                marker-end="url(#arrowhead)"
                class="connection-path"
              />
            </svg>

            <!-- 合并所有节点并按时间排序 -->
            <div 
              v-for="(node, index) in nodes" 
              :key="node.id"
              :ref="`node-${node.id}`"
              class="resizable-node"
              :class="[
                node.type === 'conversation' ? 'conversation-node' : 
                node.type === 'task-manager' ? 'task-manager-node' : 
                node.type === 'integration-analysis' ? 'integration-analysis-node' :
                node.type === 'results-solutions' ? 'results-solutions-node' :
                node.type === 'visualization-assessments' ? 'visualization-assessments-node' : 'ai-content-node'
              ]"
              :style="{
                left: node.x + 'px',
                top: node.y + 'px',
                width: node.width + 'px',
                height: node.height + 'px',
                position: 'absolute',
                zIndex: 100,
                background: 'rgba(255, 255, 255, 0.95)'
              }"
              @mousedown="startDrag($event, node)"
            >
              <!-- 对话节点内容 -->
              <div v-if="node.type === 'conversation'" class="node-content conversation-node-content">
                <div class="node-header">
                  <div class="node-info">
                    <div class="node-number">对话 #{{ index + 1 }}</div>
                    <span class="node-type-badge conversation-badge">对话记录</span>
                    <span v-if="selectedTask" class="latest-badge">最新记录</span>
                  </div>
                  <div class="username">{{ node.data.username || '用户' }}</div>
                </div>
                
                <div class="node-body" @click="navigateToConversation(node.data)">
                  <div class="question-section">
                    <h4>问题:</h4>
                    <div class="question-text">{{ node.data.user_question }}</div>
                  </div>
                  
                  <div class="response-section">
                    <h4>AI回复:</h4>
                    <div class="response-text">{{ node.data.ai_response }}</div>
                  </div>
                  
                  <!-- 跳转提示 -->
                  <div class="navigation-hint">
                    <i class="nav-icon">💬</i>
                    <span>点击跳转到对话页面</span>
                  </div>
                </div>
                
                <div class="node-footer">
                  <span class="task-name">{{ node.data.task_name || '未分类' }}</span>
                  <button @click.stop="copyToClipboard(node.data)" class="copy-btn">复制</button>
                </div>
              </div>

              <!-- AI内容节点内容 -->
              <div v-else-if="node.type === 'ai-content'" class="node-content ai-content-node-content">
                <div class="node-header">
                  <div class="node-info">
                    <div class="node-number">内容 #{{ index + 1 }}</div>
                    <span class="node-type-badge ai-content-badge">AI内容</span>
                    <span v-if="selectedTask" class="latest-badge">最新记录</span>
                  </div>
                  <div class="username">{{ node.data.username || '用户' }}</div>
                </div>
                
                <div class="node-body" @click="navigateToContentGenerator(node.data)">
                  <div class="content-field">
                    <h4>领域:</h4>
                    <div class="field-text" style="border-left-color: #17a2b8;">{{ node.data.area }}</div>
                  </div>
                  
                  <div class="content-field">
                    <h4>受众:</h4>
                    <div class="field-text" style="border-left-color: #28a745;">{{ node.data.audience }}</div>
                  </div>
                  
                  <div class="content-field">
                    <h4>关键词:</h4>
                    <div class="field-text" style="border-left-color: #ffc107;">{{ node.data.keywords }}</div>
                  </div>
                  
                  <div class="content-field">
                    <h4>语调:</h4>
                    <div class="field-text" style="border-left-color: #dc3545;">{{ node.data.tone }}</div>
                  </div>
                  
                  <div class="content-field">
                    <h4>提示词:</h4>
                    <div class="field-text" style="border-left-color: #6f42c1; max-height: 80px;">{{ node.data.prompt }}</div>
                  </div>
                  
                  <!-- 跳转提示 -->
                  <div class="navigation-hint">
                    <i class="nav-icon">✨</i>
                    <span>点击跳转到内容生成页面</span>
                  </div>
                </div>
                
                <div class="node-footer">
                  <span class="task-name">{{ node.data.task_name || '未分类' }}</span>
                  <button @click.stop="copyAiContent(node.data)" class="copy-btn">复制</button>
                </div>
              </div>

              <!-- TaskManager节点内容 -->
              <div v-else-if="node.type === 'task-manager'" class="node-content task-manager-node-content">
                <div class="node-header">
                  <div class="node-info">
                    <div class="node-number">任务管理 #{{ index + 1 }}</div>
                    <span class="node-type-badge task-manager-badge">任务管理</span>
                    <span v-if="selectedTask" class="latest-badge">最新记录</span>
                  </div>
                  <div class="username">{{ node.data.username || '用户' }}</div>
                </div>
                
                <div class="node-body" @click="navigateToTaskManager(node.data)">
                  <div class="content-field">
                    <h4>AI回复:</h4>
                    <div class="field-text task-manager-ai-response" style="border-left-color: #007bff;">
                      {{ (node.data.ai_response || '').substring(0, 100) }}{{ (node.data.ai_response || '').length > 100 ? '...' : '' }}
                    </div>
                  </div>
                  
                  <div class="content-field">
                    <h4>已添加任务:</h4>
                    <div class="field-text" style="border-left-color: #28a745;">
                      {{ Array.isArray(node.data.added_tasks) ? node.data.added_tasks.join(', ') : (node.data.added_tasks || '无') }}
                    </div>
                  </div>
                  
                  <div class="content-field">
                    <h4>任务详情:</h4>
                    <div class="field-text" style="border-left-color: #6c757d;">
                      {{ typeof node.data.task_details === 'object' ? JSON.stringify(node.data.task_details).substring(0, 80) + '...' : (node.data.task_details || '无') }}
                    </div>
                  </div>
                  
                  <!-- 跳转提示 -->
                  <div class="navigation-hint">
                    <i class="nav-icon">📋</i>
                    <span>点击跳转到任务管理页面</span>
                  </div>
                </div>
                
                <div class="node-footer">
                  <span class="task-name">{{ node.data.task_name || '未分类' }}</span>
                  <button @click.stop="copyTaskManagerContent(node.data)" class="copy-btn">复制</button>
                </div>
              </div>

              <!-- Integration Analysis节点内容 -->
              <div v-else-if="node.type === 'integration-analysis'" class="node-content integration-analysis-node-content">
                <div class="node-header">
                  <div class="node-info">
                    <div class="node-number">整合分析 #{{ index + 1 }}</div>
                    <span class="node-type-badge integration-analysis-badge">整合分析</span>
                    <span v-if="selectedTask" class="latest-badge">最新记录</span>
                  </div>
                </div>
                
                <div class="node-body" @click="navigateToIntegrationAnalysis(node.data)">
                  <div class="content-field">
                    <h4>所有问题:</h4>
                    <div class="field-text" style="border-left-color: #17a2b8;">
                      {{ (node.data.all_issues || '').substring(0, 100) }}{{ (node.data.all_issues || '').length > 100 ? '...' : '' }}
                    </div>
                  </div>
                  
                  <div class="content-field">
                    <h4>选中问题:</h4>
                    <div class="field-text" style="border-left-color: #28a745;">
                      {{ (node.data.selected_issues || '').substring(0, 100) }}{{ (node.data.selected_issues || '').length > 100 ? '...' : '' }}
                    </div>
                  </div>
                  
                  <div class="content-field" v-if="node.data.ai_solution">
                    <h4>AI解决方案:</h4>
                    <div class="field-text" style="border-left-color: #ffc107;">
                      {{ (node.data.ai_solution || '').substring(0, 100) }}{{ (node.data.ai_solution || '').length > 100 ? '...' : '' }}
                    </div>
                  </div>
                  
                  <!-- 跳转提示 -->
                  <div class="navigation-hint">
                    <i class="nav-icon">🔍</i>
                    <span>点击跳转到整合分析页面</span>
                  </div>
                </div>
                
                <div class="node-footer">
                  <span class="task-name">{{ node.data.task_name || '未分类' }}</span>
                  <button @click.stop="copyIntegrationAnalysis(node.data)" class="copy-btn">复制</button>
                </div>
              </div>

              <!-- Results Solutions节点内容 -->
              <div v-else-if="node.type === 'results-solutions'" class="node-content results-solutions-node-content">
                <div class="node-header">
                  <div class="node-info">
                    <div class="node-number">结果方案 #{{ index + 1 }}</div>
                    <span class="node-type-badge results-solutions-badge">结果方案</span>
                    <span v-if="selectedTask" class="latest-badge">最新记录</span>
                  </div>
                </div>
                
                <div class="node-body" @click="navigateToResultsSolutions(node.data)">
                  <div class="content-field">
                    <h4>选中问题:</h4>
                    <div class="field-text" style="border-left-color: #6f42c1;">
                      {{ (node.data.selected_issues || '').substring(0, 120) }}{{ (node.data.selected_issues || '').length > 120 ? '...' : '' }}
                    </div>
                  </div>
                  
                  <div class="content-field" v-if="node.data.solution1_title">
                    <h4>{{ node.data.solution1_title }}:</h4>
                    <div class="field-text" style="border-left-color: #e83e8c;">
                      {{ (node.data.solution1_content || '').substring(0, 120) }}{{ (node.data.solution1_content || '').length > 120 ? '...' : '' }}
                    </div>
                  </div>
                  
                  <div class="content-field" v-if="node.data.solution2_title">
                    <h4>{{ node.data.solution2_title }}:</h4>
                    <div class="field-text" style="border-left-color: #20c997;">
                      {{ (node.data.solution2_content || '').substring(0, 100) }}{{ (node.data.solution2_content || '').length > 100 ? '...' : '' }}
                    </div>
                  </div>
                  
                  <div class="content-field" v-if="node.data.all_issues">
                    <h4>所有问题:</h4>
                    <div class="field-text" style="border-left-color: #fd7e14;">
                      {{ (node.data.all_issues || '').substring(0, 80) }}{{ (node.data.all_issues || '').length > 80 ? '...' : '' }}
                    </div>
                  </div>
                  
                  <!-- 跳转提示 -->
                  <div class="navigation-hint">
                    <i class="nav-icon">🎯</i>
                    <span>点击跳转到结果方案页面</span>
                  </div>
                </div>
                
                <div class="node-footer">
                  <span class="task-name">{{ node.data.task_name || '未分类' }}</span>
                  <button @click.stop="copyResultsSolutions(node.data)" class="copy-btn">复制</button>
                </div>
              </div>

              <!-- Visualization Assessments节点内容 -->
              <div v-else-if="node.type === 'visualization-assessments'" class="node-content visualization-assessments-node-content">
                <div class="node-header">
                  <div class="node-info">
                    <div class="node-number">可视化评估 #{{ index + 1 }}</div>
                    <span class="node-type-badge visualization-assessments-badge">可视化评估</span>
                    <span v-if="selectedTask" class="latest-badge">最新记录</span>
                  </div>
                </div>
                
                <div class="node-body" @click="navigateToVisualizationAssessments(node.data)">
                  <div class="content-field">
                    <h4>准确性评分:</h4>
                    <div class="field-text" style="border-left-color: #28a745;">
                      {{ node.data.accuracy_score || '0' }}/5.0
                    </div>
                  </div>
                  
                  <div class="content-field">
                    <h4>清晰性评分:</h4>
                    <div class="field-text" style="border-left-color: #17a2b8;">
                      {{ node.data.clarity_score || '0' }}/5.0
                    </div>
                  </div>
                  
                  <div class="content-field">
                    <h4>可解释性评分:</h4>
                    <div class="field-text" style="border-left-color: #ffc107;">
                      {{ node.data.interpretability_score || '0' }}/5.0
                    </div>
                  </div>
                  
                  <div class="content-field">
                    <h4>创新性评分:</h4>
                    <div class="field-text" style="border-left-color: #dc3545;">
                      {{ node.data.innovation_score || '0' }}/5.0
                    </div>
                  </div>
                  
                  <div class="content-field" v-if="node.data.assessment_content">
                    <h4>评估内容:</h4>
                    <div class="field-text" style="border-left-color: #6f42c1;">
                      {{ (node.data.assessment_content || '').substring(0, 100) }}{{ (node.data.assessment_content || '').length > 100 ? '...' : '' }}
                    </div>
                  </div>
                  
                  <!-- 跳转提示 -->
                  <div class="navigation-hint">
                    <i class="nav-icon">📊</i>
                    <span>点击跳转到可视化评估页面</span>
                  </div>
                </div>
                
                <div class="node-footer">
                  <span class="task-name">{{ node.data.task_name || '未分类' }}</span>
                  <button @click.stop="copyVisualizationAssessments(node.data)" class="copy-btn">复制</button>
                </div>
              </div>

              <!-- 调整大小的控制点 -->
              <div class="resize-handles">
                <div class="resize-handle nw" @mousedown="startResize($event, node, 'nw')"></div>
                <div class="resize-handle ne" @mousedown="startResize($event, node, 'ne')"></div>
                <div class="resize-handle sw" @mousedown="startResize($event, node, 'sw')"></div>
                <div class="resize-handle se" @mousedown="startResize($event, node, 'se')"></div>
                <div class="resize-handle n" @mousedown="startResize($event, node, 'n')"></div>
                <div class="resize-handle s" @mousedown="startResize($event, node, 's')"></div>
                <div class="resize-handle w" @mousedown="startResize($event, node, 'w')"></div>
                <div class="resize-handle e" @mousedown="startResize($event, node, 'e')"></div>
              </div>
            </div>

            <!-- 无数据提示 -->
            <div v-if="nodes.length === 0" class="empty-state">
              <p>当前暂无操作流程记录</p>
              <p>请开始对话或生成内容来展示操作流程</p>
              <p class="debug-info">调试信息: 对话{{ conversations.length }}条, AI内容{{ aiContents.length }}条, 任务管理{{ taskManagerContents.length }}条, 整合分析{{ integrationAnalysis.length }}条, 结果方案{{ resultsSolutions.length }}条, 可视化评估{{ visualizationAssessments.length }}条</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { useSidebar } from '@/utils/sidebarMixin';

export default {
  name: 'Flowchart',
  setup() {
    // 使用侧栏 composable
    const { sidebarCollapsed, toggleSidebar } = useSidebar();
    
    return {
      sidebarCollapsed,
      toggleSidebar
    };
  },
  data() {
    return {
      conversations: [],
      aiContents: [], // AI内容数据
      taskManagerContents: [], // TaskManager内容数据
      integrationAnalysis: [], // Integration Analysis数据
      resultsSolutions: [], // Results Solutions数据
      visualizationAssessments: [], // Visualization Assessments数据
      loading: false,
      selectedTask: null, // 当前选中的任务
      uniqueTasks: [], // 去重后的任务列表
      // 节点图相关数据
      canvasWidth: 1200,
      canvasHeight: 800,
      nodes: [], // 确保节点数组是响应式的
      connections: [],
      dragState: {
        isDragging: false,
        isResizing: false,
        dragNode: null,
        resizeNode: null,
        resizeDirection: '',
        startX: 0,
        startY: 0,
        startNodeX: 0,
        startNodeY: 0,
        startNodeWidth: 0,
        startNodeHeight: 0
      }
    };
  },
  computed: {
    // 根据选中的任务过滤对话，如果没有选中任务则显示所有
    filteredConversations() {
      let filtered = this.selectedTask 
        ? this.conversations.filter(conv => conv.task_name === this.selectedTask)
        : this.conversations;
      
      // 如果选中了任务，只返回最新的一条记录
      if (this.selectedTask && filtered.length > 0) {
        // 按创建时间降序排序，取第一条（最新的）
        return filtered
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 1);
      }
      
      // 如果没有选中任务，显示所有记录
      return filtered
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    
    // 根据选中的任务过滤AI内容，如果没有选中任务则显示所有
    filteredAiContents() {
      let filtered = this.selectedTask 
        ? this.aiContents.filter(content => content.task_name === this.selectedTask)
        : this.aiContents;
      
      // 如果选中了任务，只返回最新的一条记录
      if (this.selectedTask && filtered.length > 0) {
        // 按时间戳降序排序，取第一条（最新的）
        return filtered
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 1);
      }
      
      // 如果没有选中任务，显示所有记录
      return filtered
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    
    // 根据选中的任务过滤TaskManager内容，如果没有选中任务则显示所有
    filteredTaskManagerContents() {
      let filtered = this.selectedTask 
        ? this.taskManagerContents.filter(content => content.task_name === this.selectedTask)
        : this.taskManagerContents;
      
      // 如果选中了任务，只返回最新的一条记录
      if (this.selectedTask && filtered.length > 0) {
        // 按创建时间降序排序，取第一条（最新的）
        return filtered
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 1);
      }
      
      // 如果没有选中任务，显示所有记录
      return filtered
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    
    // 根据选中的任务过滤Integration Analysis内容，如果没有选中任务则显示所有
    filteredIntegrationAnalysis() {
      let filtered = this.selectedTask 
        ? this.integrationAnalysis.filter(content => content.task_name === this.selectedTask)
        : this.integrationAnalysis;
      
      // 如果选中了任务，只返回最新的一条记录
      if (this.selectedTask && filtered.length > 0) {
        // 按创建时间降序排序，取第一条（最新的）
        return filtered
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 1);
      }
      
      // 如果没有选中任务，显示所有记录
      return filtered
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    
    // 根据选中的任务过滤Results Solutions内容，如果没有选中任务则显示所有
    filteredResultsSolutions() {
      let filtered = this.selectedTask 
        ? this.resultsSolutions.filter(content => content.task_name === this.selectedTask)
        : this.resultsSolutions;
      
      // 如果选中了任务，只返回最新的一条记录
      if (this.selectedTask && filtered.length > 0) {
        // 按创建时间降序排序，取第一条（最新的）
        return filtered
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 1);
      }
      
      // 如果没有选中任务，显示所有记录
      return filtered
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    
    // 根据选中的任务过滤Visualization Assessments内容，如果没有选中任务则显示所有
    filteredVisualizationAssessments() {
      let filtered = this.selectedTask 
        ? this.visualizationAssessments.filter(content => content.task_name === this.selectedTask)
        : this.visualizationAssessments;
      
      // 如果选中了任务，只返回最新的一条记录
      if (this.selectedTask && filtered.length > 0) {
        // 按创建时间降序排序，取第一条（最新的）
        return filtered
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 1);
      }
      
      // 如果没有选中任务，显示所有记录
      return filtered
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  },
  mounted() {
    this.loadConversations();
    this.loadAiContents(); // 加载AI内容
    this.loadTaskManagerContents(); // 加载TaskManager内容
    this.loadIntegrationAnalysis(); // 加载Integration Analysis内容
    this.loadResultsSolutions(); // 加载Results Solutions内容
    this.loadVisualizationAssessments(); // 加载Visualization Assessments内容
    this.setupEventListeners();
    this.$nextTick(() => {
      this.updateCanvasSize();
    });
  },
  
  beforeDestroy() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  },
  methods: {
    async loadConversations() {
      this.loading = true;
      try {
  const response = await fetch('/api/conversations', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.conversations = data.conversations || [];
          this.processTaskList(); // 处理任务列表
          console.log('成功加载', this.conversations.length, '条对话记录');
          // 延迟调用创建节点，确保所有数据都已加载
          this.$nextTick(() => {
            this.createNodes(); // 创建节点图
          });
        } else {
          console.error('获取对话记录失败:', response.status);
          if (response.status === 404) {
            console.error('API接口不存在，请检查后端服务器是否启动');
          }
        }
      } catch (error) {
        console.error('加载对话记录网络错误:', error);
        if (error.message.includes('Failed to fetch')) {
          console.error('无法连接到后端服务器，请检查服务器是否在运行');
        }
      } finally {
        this.loading = false;
      }
    },
    
    // 新增：加载AI内容
    async loadAiContents() {
      try {
  const response = await fetch('/api/ai-content', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.aiContents = data.aiContents || [];
          this.processTaskList(); // 重新处理任务列表，包含AI内容
          console.log('成功加载', this.aiContents.length, '条AI内容记录');
          // 延迟调用创建节点，确保所有数据都已加载
          this.$nextTick(() => {
            this.createNodes(); // 创建节点图
          });
        } else {
          console.error('获取AI内容失败:', response.status);
        }
      } catch (error) {
        console.error('加载AI内容网络错误:', error);
      }
    },
    
    // 新增：加载TaskManager内容
    async loadTaskManagerContents() {
      try {
  const response = await fetch('/api/task-manager-content', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.taskManagerContents = data.taskManagerContents || [];
          this.processTaskList(); // 重新处理任务列表，包含TaskManager内容
          console.log('成功加载', this.taskManagerContents.length, '条TaskManager内容记录');
          // 延迟调用创建节点，确保所有数据都已加载
          this.$nextTick(() => {
            this.createNodes(); // 创建节点图
          });
        } else {
          console.error('获取TaskManager内容失败:', response.status);
        }
      } catch (error) {
        console.error('加载TaskManager内容网络错误:', error);
      }
    },
    // 新增：加载Integration Analysis内容
    async loadIntegrationAnalysis() {
      try {
  const response = await fetch('/api/integration-analysis', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.integrationAnalysis = data.analysisRecords || [];
          this.processTaskList(); // 重新处理任务列表，包含Integration Analysis内容
          console.log('成功加载', this.integrationAnalysis.length, '条Integration Analysis记录');
          // 延迟调用创建节点，确保所有数据都已加载
          this.$nextTick(() => {
            this.createNodes(); // 创建节点图
          });
        } else {
          console.error('获取Integration Analysis内容失败:', response.status);
        }
      } catch (error) {
        console.error('加载Integration Analysis内容网络错误:', error);
      }
    },

    // 新增：加载Results Solutions内容
    async loadResultsSolutions() {
      try {
  const response = await fetch('/api/results-solutions', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.resultsSolutions = data.solutions || [];
          this.processTaskList(); // 重新处理任务列表，包含Results Solutions内容
          console.log('成功加载', this.resultsSolutions.length, '条Results Solutions记录');
          console.log('Results Solutions数据:', this.resultsSolutions);
          // 延迟调用创建节点，确保所有数据都已加载
          this.$nextTick(() => {
            this.createNodes(); // 创建节点图
          });
        } else {
          console.error('获取Results Solutions内容失败:', response.status);
        }
      } catch (error) {
        console.error('加载Results Solutions内容网络错误:', error);
      }
    },
    
    // 新增：加载Visualization Assessments内容
    async loadVisualizationAssessments() {
      try {
  const response = await fetch('/api/visualization-assessments', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.visualizationAssessments = data.assessments || [];
          this.processTaskList(); // 重新处理任务列表，包含Visualization Assessments内容
          console.log('成功加载', this.visualizationAssessments.length, '条Visualization Assessments记录');
          console.log('Visualization Assessments数据:', this.visualizationAssessments);
          // 延迟调用创建节点，确保所有数据都已加载
          this.$nextTick(() => {
            this.createNodes(); // 创建节点图
          });
        } else {
          console.error('获取Visualization Assessments内容失败:', response.status);
        }
      } catch (error) {
        console.error('加载Visualization Assessments内容网络错误:', error);
      }
    },
    
    processTaskList() {
      const taskMap = new Map();
      
      // 统计对话记录中的任务
      this.conversations.forEach(conv => {
        const taskName = conv.task_name || '未命名任务';
        if (taskMap.has(taskName)) {
          taskMap.get(taskName).conversationCount += 1;
        } else {
          taskMap.set(taskName, { conversationCount: 1, aiContentCount: 0, taskManagerCount: 0, integrationAnalysisCount: 0, resultsSolutionsCount: 0, visualizationAssessmentsCount: 0 });
        }
      });
      
      // 统计AI内容中的任务
      this.aiContents.forEach(content => {
        const taskName = content.task_name || '未命名任务';
        if (taskMap.has(taskName)) {
          taskMap.get(taskName).aiContentCount += 1;
        } else {
          taskMap.set(taskName, { conversationCount: 0, aiContentCount: 1, taskManagerCount: 0, integrationAnalysisCount: 0, resultsSolutionsCount: 0, visualizationAssessmentsCount: 0 });
        }
      });
      
      // 统计TaskManager内容中的任务
      this.taskManagerContents.forEach(content => {
        const taskName = content.task_name || '未命名任务';
        if (taskMap.has(taskName)) {
          taskMap.get(taskName).taskManagerCount += 1;
        } else {
          taskMap.set(taskName, { conversationCount: 0, aiContentCount: 0, taskManagerCount: 1, integrationAnalysisCount: 0, resultsSolutionsCount: 0, visualizationAssessmentsCount: 0 });
        }
      });
      
      // 统计Integration Analysis内容中的任务
      this.integrationAnalysis.forEach(content => {
        const taskName = content.task_name || '未命名任务';
        if (taskMap.has(taskName)) {
          taskMap.get(taskName).integrationAnalysisCount += 1;
        } else {
          taskMap.set(taskName, { conversationCount: 0, aiContentCount: 0, taskManagerCount: 0, integrationAnalysisCount: 1, resultsSolutionsCount: 0, visualizationAssessmentsCount: 0 });
        }
      });
      
      // 统计Results Solutions内容中的任务
      this.resultsSolutions.forEach(content => {
        const taskName = content.task_name || '未命名任务';
        if (taskMap.has(taskName)) {
          taskMap.get(taskName).resultsSolutionsCount += 1;
        } else {
          taskMap.set(taskName, { conversationCount: 0, aiContentCount: 0, taskManagerCount: 0, integrationAnalysisCount: 0, resultsSolutionsCount: 1, visualizationAssessmentsCount: 0 });
        }
      });
      
      // 统计Visualization Assessments内容中的任务
      this.visualizationAssessments.forEach(content => {
        const taskName = content.task_name || '未命名任务';
        if (taskMap.has(taskName)) {
          taskMap.get(taskName).visualizationAssessmentsCount += 1;
        } else {
          taskMap.set(taskName, { conversationCount: 0, aiContentCount: 0, taskManagerCount: 0, integrationAnalysisCount: 0, resultsSolutionsCount: 0, visualizationAssessmentsCount: 1 });
        }
      });
      
      this.uniqueTasks = Array.from(taskMap.entries()).map(([name, counts]) => ({
        name,
        conversationCount: counts.conversationCount,
        aiContentCount: counts.aiContentCount,
        taskManagerCount: counts.taskManagerCount,
        integrationAnalysisCount: counts.integrationAnalysisCount,
        resultsSolutionsCount: counts.resultsSolutionsCount,
        visualizationAssessmentsCount: counts.visualizationAssessmentsCount,
        totalCount: counts.conversationCount + counts.aiContentCount + counts.taskManagerCount + counts.integrationAnalysisCount + counts.resultsSolutionsCount + counts.visualizationAssessmentsCount
      })).sort((a, b) => b.totalCount - a.totalCount); // 按总数量降序排列
    },
    
    // 选择任务
    selectTask(taskName) {
      this.selectedTask = taskName;
      this.$nextTick(() => {
        this.createNodes(); // 重新创建节点
      });
    },
    
    // 显示所有任务
    showAllTasks() {
      this.selectedTask = null;
      this.$nextTick(() => {
        this.createNodes(); // 重新创建节点
      });
    },
    
    // 新增：刷新所有数据
    async refreshData() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadConversations(),
          this.loadAiContents(),
          this.loadTaskManagerContents(),
          this.loadIntegrationAnalysis(),
          this.loadResultsSolutions(),
          this.loadVisualizationAssessments()
        ]);
      } finally {
        this.loading = false;
      }
    },
    // 新增：更新显示（方法保留但不再需要）
    updateDisplay() {
      // 现在总是显示最新的一条记录
      console.log('显示当前操作流程的最新记录');
    },

    // 创建节点图数据
    createNodes() {
      // 直接赋值空数组，Vue 3 中不需要 $set
      this.nodes = [];
      let nodeY = 50;

      // 合并对话、AI内容、TaskManager内容、Integration Analysis内容和Results Solutions内容，按时间排序
      const allItems = [];
      
      console.log('开始创建节点 - 对话数据:', this.filteredConversations);
      console.log('开始创建节点 - AI内容数据:', this.filteredAiContents);
      console.log('开始创建节点 - TaskManager数据:', this.filteredTaskManagerContents);
      console.log('开始创建节点 - Integration Analysis数据:', this.filteredIntegrationAnalysis);
      console.log('开始创建节点 - Results Solutions数据:', this.filteredResultsSolutions);
      console.log('开始创建节点 - Visualization Assessments数据:', this.filteredVisualizationAssessments);
      console.log('当前选中任务:', this.selectedTask);
      
      this.filteredConversations.forEach(conv => {
        console.log('处理对话记录:', conv);
        allItems.push({
          type: 'conversation',
          data: conv,
          time: new Date(conv.created_at)
        });
      });
      
      this.filteredAiContents.forEach(content => {
        console.log('处理AI内容:', content);
        allItems.push({
          type: 'ai-content',
          data: content,
          time: new Date(content.timestamp)
        });
      });
      
      this.filteredTaskManagerContents.forEach(content => {
        console.log('处理TaskManager内容:', content);
        allItems.push({
          type: 'task-manager',
          data: content,
          time: new Date(content.created_at)
        });
      });
      
      this.filteredIntegrationAnalysis.forEach(content => {
        console.log('处理Integration Analysis内容:', content);
        allItems.push({
          type: 'integration-analysis',
          data: content,
          time: new Date(content.created_at)
        });
      });
      
      this.filteredResultsSolutions.forEach(content => {
        console.log('处理Results Solutions内容:', content);
        allItems.push({
          type: 'results-solutions',
          data: content,
          time: new Date(content.created_at)
        });
      });
      
      this.filteredVisualizationAssessments.forEach(content => {
        console.log('处理Visualization Assessments内容:', content);
        allItems.push({
          type: 'visualization-assessments',
          data: content,
          time: new Date(content.created_at)
        });
      });

      console.log('合并后的所有项目:', allItems);

      if (allItems.length === 0) {
        console.log('没有数据可显示！');
        console.log('原因分析:');
        console.log('- 对话记录数量:', this.conversations.length);
        console.log('- AI内容数量:', this.aiContents.length);
        console.log('- TaskManager内容数量:', this.taskManagerContents.length);
        console.log('- Integration Analysis内容数量:', this.integrationAnalysis.length);
        console.log('- Results Solutions内容数量:', this.resultsSolutions.length);
        console.log('- Visualization Assessments内容数量:', this.visualizationAssessments.length);
        console.log('- 过滤后对话数量:', this.filteredConversations.length);
        console.log('- 过滤后AI内容数量:', this.filteredAiContents.length);
        console.log('- 过滤后TaskManager数量:', this.filteredTaskManagerContents.length);
        console.log('- 过滤后Integration Analysis数量:', this.filteredIntegrationAnalysis.length);
        console.log('- 过滤后Results Solutions数量:', this.filteredResultsSolutions.length);
        console.log('- 过滤后Visualization Assessments数量:', this.filteredVisualizationAssessments.length);
        console.log('- 选中任务:', this.selectedTask);
        
        // 如果选中了任务但没有数据，不自动切换到显示所有数据
        // 让用户明确知道该任务没有数据
        return;
      }

      // 按时间排序
      if (this.selectedTask) {
        // 当选中任务时，显示对话、AI内容、TaskManager、Integration Analysis和Results Solutions的最新记录（如果都存在的话）
        // 已经通过computed属性过滤了，这里直接按时间排序即可
        allItems.sort((a, b) => a.time - b.time);
        console.log('选中任务的记录:', allItems);
      } else {
        // 没有选中任务时，按时间正序排列显示所有数据
        allItems.sort((a, b) => a.time - b.time);
      }

      // 创建节点数组
      const newNodes = [];
      allItems.forEach((item, index) => {
        const node = {
          id: `${item.type}-${item.data.id}`,
          type: item.type,
          data: item.data,
          x: 50,
          y: nodeY,
          width: 350,
          height: item.type === 'conversation' ? 300 : 
                 (item.type === 'task-manager' ? 350 : 
                  (item.type === 'integration-analysis' ? 320 : 
                   (item.type === 'results-solutions' ? 400 : 
                    (item.type === 'visualization-assessments' ? 380 : 400)))),
          timestamp: this.formatTime(item.time),
          sortTime: item.time
        };
        
        console.log(`创建节点 ${index}:`, {
          id: node.id,
          type: node.type,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height
        });
        
        newNodes.push(node);
        nodeY += node.height + 80; // 节点间距
      });

      // 直接替换整个数组以确保响应式
      this.nodes = newNodes;

      console.log('创建的节点:', this.nodes);

      // 更新画布高度以适应所有节点
      this.canvasHeight = Math.max(800, nodeY + 100);

      this.$nextTick(() => {
        this.calculateConnections();
      });
    },

    // 计算连接线
    calculateConnections() {
      this.connections = [];
      
      // 对于选中任务的情况，使用特定的连接规则
      if (this.selectedTask) {
        // 查找不同类型的节点
        const conversationNodes = this.nodes.filter(node => node.type === 'conversation');
        const aiContentNodes = this.nodes.filter(node => node.type === 'ai-content');
        const taskManagerNodes = this.nodes.filter(node => node.type === 'task-manager');
        const integrationAnalysisNodes = this.nodes.filter(node => node.type === 'integration-analysis');
        const resultsSolutionsNodes = this.nodes.filter(node => node.type === 'results-solutions');
        const visualizationAssessmentsNodes = this.nodes.filter(node => node.type === 'visualization-assessments');
        
        // 连接对话到AI内容
        conversationNodes.forEach(convNode => {
          aiContentNodes.forEach(aiNode => {
            this.createConnection(convNode, aiNode);
          });
        });
        
        // 连接AI内容到TaskManager
        aiContentNodes.forEach(aiNode => {
          taskManagerNodes.forEach(tmNode => {
            this.createConnection(aiNode, tmNode);
          });
        });
        
        // 连接TaskManager到Integration Analysis
        taskManagerNodes.forEach(tmNode => {
          integrationAnalysisNodes.forEach(iaNode => {
            this.createConnection(tmNode, iaNode);
          });
        });
        
        // 连接Integration Analysis到Results Solutions
        integrationAnalysisNodes.forEach(iaNode => {
          resultsSolutionsNodes.forEach(rsNode => {
            this.createConnection(iaNode, rsNode);
          });
        });
        
        // 连接Results Solutions到Visualization Assessments
        resultsSolutionsNodes.forEach(rsNode => {
          visualizationAssessmentsNodes.forEach(vaNode => {
            this.createConnection(rsNode, vaNode);
          });
        });
      } else {
        // 如果没有选中任务，使用按时间排序的传统连接方式
        const sortedNodes = [...this.nodes].sort((a, b) => new Date(a.sortTime) - new Date(b.sortTime));
        
        for (let i = 0; i < sortedNodes.length - 1; i++) {
          const currentNode = sortedNodes[i];
          const nextNode = sortedNodes[i + 1];
          this.createConnection(currentNode, nextNode);
        }
      }
      
      console.log('计算的连接线:', this.connections);
    },
    
    // 创建连接线的辅助方法
    createConnection(fromNode, toNode) {
      const startX = fromNode.x + fromNode.width / 2;
      const startY = fromNode.y + fromNode.height;
      const endX = toNode.x + toNode.width / 2;
      const endY = toNode.y;
      
      // 创建贝塞尔曲线路径
      const midY = startY + (endY - startY) / 2;
      const path = `M ${startX} ${startY} Q ${startX} ${midY} ${endX} ${endY}`;
      
      this.connections.push({
        from: fromNode.id,
        to: toNode.id,
        path: path
      });
    },

    // 开始拖拽
    startDrag(event, node) {
      if (this.dragState.isResizing) return;
      
      this.dragState.isDragging = true;
      this.dragState.dragNode = node;
      this.dragState.startX = event.clientX;
      this.dragState.startY = event.clientY;
      this.dragState.startNodeX = node.x;
      this.dragState.startNodeY = node.y;
      
      event.preventDefault();
    },

    // 开始调整大小
    startResize(event, node, direction) {
      this.dragState.isResizing = true;
      this.dragState.resizeNode = node;
      this.dragState.resizeDirection = direction;
      this.dragState.startX = event.clientX;
      this.dragState.startY = event.clientY;
      this.dragState.startNodeX = node.x;
      this.dragState.startNodeY = node.y;
      this.dragState.startNodeWidth = node.width;
      this.dragState.startNodeHeight = node.height;
      
      event.preventDefault();
      event.stopPropagation();
    },

    // 鼠标移动处理
    handleMouseMove(event) {
      if (this.dragState.isDragging && this.dragState.dragNode) {
        const deltaX = event.clientX - this.dragState.startX;
        const deltaY = event.clientY - this.dragState.startY;
        
        this.dragState.dragNode.x = Math.max(0, this.dragState.startNodeX + deltaX);
        this.dragState.dragNode.y = Math.max(0, this.dragState.startNodeY + deltaY);
        
        this.calculateConnections();
      } else if (this.dragState.isResizing && this.dragState.resizeNode) {
        this.handleResize(event);
      }
    },

    // 处理调整大小
    handleResize(event) {
      const deltaX = event.clientX - this.dragState.startX;
      const deltaY = event.clientY - this.dragState.startY;
      const node = this.dragState.resizeNode;
      const direction = this.dragState.resizeDirection;
      
      const minWidth = 200;
      const minHeight = 150;
      
      switch (direction) {
        case 'se': // 右下
          node.width = Math.max(minWidth, this.dragState.startNodeWidth + deltaX);
          node.height = Math.max(minHeight, this.dragState.startNodeHeight + deltaY);
          break;
        case 'sw': // 左下
          const newWidth = Math.max(minWidth, this.dragState.startNodeWidth - deltaX);
          node.x = this.dragState.startNodeX - (newWidth - this.dragState.startNodeWidth);
          node.width = newWidth;
          node.height = Math.max(minHeight, this.dragState.startNodeHeight + deltaY);
          break;
        case 'ne': // 右上
          const newHeight = Math.max(minHeight, this.dragState.startNodeHeight - deltaY);
          node.y = this.dragState.startNodeY - (newHeight - this.dragState.startNodeHeight);
          node.width = Math.max(minWidth, this.dragState.startNodeWidth + deltaX);
          node.height = newHeight;
          break;
        case 'nw': // 左上
          const newWidthNW = Math.max(minWidth, this.dragState.startNodeWidth - deltaX);
          const newHeightNW = Math.max(minHeight, this.dragState.startNodeHeight - deltaY);
          node.x = this.dragState.startNodeX - (newWidthNW - this.dragState.startNodeWidth);
          node.y = this.dragState.startNodeY - (newHeightNW - this.dragState.startNodeHeight);
          node.width = newWidthNW;
          node.height = newHeightNW;
          break;
        case 'n': // 上
          const newHeightN = Math.max(minHeight, this.dragState.startNodeHeight - deltaY);
          node.y = this.dragState.startNodeY - (newHeightN - this.dragState.startNodeHeight);
          node.height = newHeightN;
          break;
        case 's': // 下
          node.height = Math.max(minHeight, this.dragState.startNodeHeight + deltaY);
          break;
        case 'w': // 左
          const newWidthW = Math.max(minWidth, this.dragState.startNodeWidth - deltaX);
          node.x = this.dragState.startNodeX - (newWidthW - this.dragState.startNodeWidth);
          node.width = newWidthW;
          break;
        case 'e': // 右
          node.width = Math.max(minWidth, this.dragState.startNodeWidth + deltaX);
          break;
      }
      
      this.calculateConnections();
    },

    // 鼠标释放处理
    handleMouseUp() {
      this.dragState.isDragging = false;
      this.dragState.isResizing = false;
      this.dragState.dragNode = null;
      this.dragState.resizeNode = null;
    },

    // 设置事件监听器
    setupEventListeners() {
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    },

    // 更新画布大小
    updateCanvasSize() {
      if (this.$refs.nodeContainer) {
        this.canvasWidth = this.$refs.nodeContainer.clientWidth;
        this.canvasHeight = Math.max(800, this.$refs.nodeContainer.clientHeight);
      }
    },
    
    formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    async copyToClipboard(conversation) {
      const text = `用户问题: ${conversation.user_question}\n\nAI回复: ${conversation.ai_response}`;
      try {
        await navigator.clipboard.writeText(text);
        alert('对话内容已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动复制');
      }
    },
    
    // 新增：复制AI内容
    async copyAiContent(content) {
      const text = `Prompt: ${content.area}\n\nMemory: ${content.audience}\n\nCommand: ${content.keywords}\n\nKey: ${content.tone}\n\nContext: ${content.prompt}`;
      try {
        await navigator.clipboard.writeText(text);
        alert('AI内容已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动复制');
      }
    },

    // 新增：复制TaskManager内容
    async copyTaskManagerContent(content) {
      const addedTasks = Array.isArray(content.added_tasks) ? content.added_tasks.join(', ') : (content.added_tasks || '无');
      const taskDetails = typeof content.task_details === 'object' ? JSON.stringify(content.task_details, null, 2) : (content.task_details || '无');
      const text = `AI回复: ${content.ai_response || '无'}\n\n已添加任务: ${addedTasks}\n\n任务详情: ${taskDetails}`;
      try {
        await navigator.clipboard.writeText(text);
        alert('TaskManager内容已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动复制');
      }
    },

    // 新增：复制Integration Analysis内容
    async copyIntegrationAnalysis(content) {
      const text = `所有问题: ${content.all_issues || '无'}\n\n选中问题: ${content.selected_issues || '无'}\n\nAI解决方案: ${content.ai_solution || '无'}`;
      try {
        await navigator.clipboard.writeText(text);
        alert('Integration Analysis内容已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动复制');
      }
    },

    // 新增：复制Results Solutions内容
    async copyResultsSolutions(content) {
      const text = `选中问题: ${content.selected_issues || '无'}\n\n${content.solution1_title || '解决方案一'}: ${content.solution1_content || '无'}\n\n${content.solution2_title || '解决方案二'}: ${content.solution2_content || '无'}\n\n所有问题: ${content.all_issues || '无'}`;
      try {
        await navigator.clipboard.writeText(text);
        alert('Results Solutions内容已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动复制');
      }
    },

    // 新增：复制Visualization Assessments内容
    async copyVisualizationAssessments(content) {
      const text = `准确性评分: ${content.accuracy_score || '0'}/5.0\n\n清晰性评分: ${content.clarity_score || '0'}/5.0\n\n可解释性评分: ${content.interpretability_score || '0'}/5.0\n\n创新性评分: ${content.innovation_score || '0'}/5.0\n\n评估内容: ${content.assessment_content || '无'}`;
      try {
        await navigator.clipboard.writeText(text);
        alert('Visualization Assessments内容已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动复制');
      }
    },

    // 获取状态文本
    getStatusText() {
      if (this.selectedTask) {
        // 统计选中任务的数据
        const taskConversations = this.conversations.filter(conv => conv.task_name === this.selectedTask);
        const taskAiContents = this.aiContents.filter(content => content.task_name === this.selectedTask);
        const taskManagerContents = this.taskManagerContents.filter(content => content.task_name === this.selectedTask);
        const taskIntegrationAnalysis = this.integrationAnalysis.filter(content => content.task_name === this.selectedTask);
        
        const totalTaskData = taskConversations.length + taskAiContents.length + taskManagerContents.length + taskIntegrationAnalysis.length;
        
        if (totalTaskData === 0) {
          return `任务 "${this.selectedTask}" - 暂无数据`;
        }
        
        // 显示该任务的所有类型记录
        const parts = [];
        if (taskConversations.length > 0) {
          const latestConv = taskConversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          parts.push(`对话(${this.formatTime(latestConv.created_at)})`);
        }
        if (taskAiContents.length > 0) {
          const latestAi = taskAiContents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
          parts.push(`AI内容(${this.formatTime(latestAi.timestamp)})`);
        }
        if (taskManagerContents.length > 0) {
          const latestTm = taskManagerContents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          parts.push(`任务管理(${this.formatTime(latestTm.created_at)})`);
        }
        if (taskIntegrationAnalysis.length > 0) {
          const latestIa = taskIntegrationAnalysis.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          parts.push(`整合分析(${this.formatTime(latestIa.created_at)})`);
        }
        
        return `任务 "${this.selectedTask}" - 最新记录: ${parts.join(' | ')}`;
      } else {
        const totalRecords = this.conversations.length + this.aiContents.length + this.taskManagerContents.length + this.integrationAnalysis.length;
        return `所有任务流程 - 共${totalRecords}条记录`;
      }
    },

    // 跳转到对话页面并填充内容
    navigateToConversation(conversationData) {
      // 将对话数据存储到sessionStorage中，供目标页面使用
      const navigationData = {
        type: 'conversation',
        data: {
          user_question: conversationData.user_question,
          ai_response: conversationData.ai_response,
          task_name: conversationData.task_name,
          username: conversationData.username,
          created_at: conversationData.created_at
        },
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('flowchart_navigation_data', JSON.stringify(navigationData));
      
      // 跳转到对话页面（假设路由名为 'dialog' 或 'chat'）
      // 根据你的实际路由配置调整
      this.$router.push({ 
        name: 'Dialog',
        query: { 
          from: 'flowchart',
          task: conversationData.task_name,
          fillData: 'true'
        }
      }).catch(err => {
        // 如果路由不存在，尝试其他可能的路由名
        console.warn('Dialog路由不存在，尝试其他路由...', err);
        // 可以尝试其他可能的路由名
        const possibleRoutes = ['Chat', 'Conversation', 'LidarDebate', 'Writing'];
        for (const routeName of possibleRoutes) {
          try {
            this.$router.push({ 
              name: routeName,
              query: { 
                from: 'flowchart',
                task: conversationData.task_name,
                fillData: 'true'
              }
            });
            break;
          } catch (routeErr) {
            console.warn(`${routeName}路由也不存在`);
          }
        }
      });
    },

    // 跳转到内容生成页面并填充内容
    navigateToContentGenerator(contentData) {
      // 将AI内容数据存储到sessionStorage中，供目标页面使用
      const navigationData = {
        type: 'ai-content',
        data: {
          area: contentData.area,
          audience: contentData.audience,
          keywords: contentData.keywords,
          tone: contentData.tone,
          prompt: contentData.prompt,
          task_name: contentData.task_name,
          username: contentData.username,
          timestamp: contentData.timestamp
        },
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('flowchart_navigation_data', JSON.stringify(navigationData));
      
      // 跳转到内容生成页面 Template.vue
      this.$router.push({ 
        name: 'Template',
        query: { 
          from: 'flowchart',
          task: contentData.task_name,
          fillData: 'true'
        }
      }).catch(err => {
        // 如果Template路由不存在，尝试其他可能的路由名
        console.warn('Template路由不存在，尝试其他路由...', err);
        // 可以尝试其他可能的内容生成相关路由
        const possibleRoutes = ['ContentIdeasGenerator', 'Writing', 'ContentGenerator', 'AIContent'];
        for (const routeName of possibleRoutes) {
          try {
            this.$router.push({ 
              name: routeName,
              query: { 
                from: 'flowchart',
                task: contentData.task_name,
                fillData: 'true'
              }
            });
            break;
          } catch (routeErr) {
            console.warn(`${routeName}路由也不存在`);
          }
        }
      });
    },

    // 跳转到TaskManager页面并填充内容
    navigateToTaskManager(taskManagerData) {
      // 将TaskManager数据存储到sessionStorage中，供目标页面使用
      const navigationData = {
        type: 'task-manager',
        data: {
          ai_response: taskManagerData.ai_response,
          added_tasks: taskManagerData.added_tasks,
          task_details: taskManagerData.task_details,
          task_name: taskManagerData.task_name,
          created_at: taskManagerData.created_at
        },
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('flowchart_navigation_data', JSON.stringify(navigationData));
      
      // 跳转到TaskManager页面
      this.$router.push({ 
        name: 'TaskManager',
        query: { 
          from: 'flowchart',
          task: taskManagerData.task_name,
          fillData: 'true'
        }
      }).catch(err => {
        console.warn('TaskManager路由不存在:', err);
      });
    },

    // 跳转到Integration Analysis页面并填充内容
    navigateToIntegrationAnalysis(integrationData) {
      // 将Integration Analysis数据存储到sessionStorage中，供目标页面使用
      const navigationData = {
        type: 'integration-analysis',
        data: {
          all_issues: integrationData.all_issues,
          selected_issues: integrationData.selected_issues,
          ai_solution: integrationData.ai_solution,
          task_name: integrationData.task_name,
          created_at: integrationData.created_at
        },
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('flowchart_navigation_data', JSON.stringify(navigationData));
      
      // 跳转到NewIntegration页面
      this.$router.push({ 
        name: 'NewIntegration',
        query: { 
          from: 'flowchart',
          task: integrationData.task_name,
          fillData: 'true',
          issues: integrationData.selected_issues || integrationData.all_issues
        }
      }).catch(err => {
        console.warn('NewIntegration路由不存在:', err);
      });
    },

    // 跳转到Results Solutions页面并填充内容
    navigateToResultsSolutions(resultsData) {
      // 将Results Solutions数据存储到sessionStorage中，供目标页面使用
      const navigationData = {
        type: 'results-solutions',
        data: {
          selected_issues: resultsData.selected_issues,
          solution1_title: resultsData.solution1_title,
          solution1_content: resultsData.solution1_content,
          solution2_title: resultsData.solution2_title,
          solution2_content: resultsData.solution2_content,
          all_issues: resultsData.all_issues,
          task_name: resultsData.task_name,
          created_at: resultsData.created_at
        },
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('flowchart_navigation_data', JSON.stringify(navigationData));
      
      // 跳转到Results或FinalResult页面
      this.$router.push({ 
        name: 'Results',
        query: { 
          from: 'flowchart',
          task: resultsData.task_name,
          fillData: 'true'
        }
      }).catch(err => {
        console.warn('Results路由不存在，尝试其他路由...', err);
        // 尝试其他可能的结果页面路由
        const possibleRoutes = ['FinalResult', 'ResultsPage', 'Solutions'];
        for (const routeName of possibleRoutes) {
          try {
            this.$router.push({ 
              name: routeName,
              query: { 
                from: 'flowchart',
                task: resultsData.task_name,
                fillData: 'true'
              }
            });
            break;
          } catch (routeErr) {
            console.warn(`${routeName}路由也不存在`);
          }
        }
      });
    },

    // 跳转到Visualization Assessments页面并填充内容
    navigateToVisualizationAssessments(assessmentData) {
      // 将Visualization Assessments数据存储到sessionStorage中，供目标页面使用
      const navigationData = {
        type: 'visualization-assessments',
        data: {
          accuracy_score: assessmentData.accuracy_score,
          clarity_score: assessmentData.clarity_score,
          interpretability_score: assessmentData.interpretability_score,
          innovation_score: assessmentData.innovation_score,
          assessment_content: assessmentData.assessment_content,
          ai_scores: assessmentData.ai_scores,
          radar_data: assessmentData.radar_data,
          task_name: assessmentData.task_name,
          created_at: assessmentData.created_at
        },
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('flowchart_navigation_data', JSON.stringify(navigationData));
      
      // 跳转到Visualization页面
      this.$router.push({ 
        name: 'Visualization',
        query: { 
          from: 'flowchart',
          task: assessmentData.task_name,
          fillData: 'true',
          aiScores: assessmentData.ai_scores || assessmentData.assessment_content
        }
      }).catch(err => {
        console.warn('Visualization路由不存在:', err);
      });
    }
  }
};
</script>

<style scoped>
@import '../utils/sidebar.css';

.flowchart-container {
  display: flex;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #e0e7ff 0%, #f9f9f9 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 任务列表特定样式 */
.task-stats {
  background: rgba(255, 255, 255, 0.15);
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.task-stats p {
  margin: 0;
  font-size: 1.1em;
  color: #ecf0f1;
  font-weight: 500;
}

.count {
  font-weight: bold;
  font-size: 1.3em;
  color: #f39c12;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  border-left: 4px solid #3498db;
  transition: all 0.2s;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.task-item:hover {
  background: rgba(255, 255, 255, 0.25);
  border-left-color: #e74c3c;
  transform: translateX(2px);
}

.task-item.active {
  background: rgba(255, 255, 255, 0.3);
  border-left-color: #f39c12;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.task-name {
  font-size: 0.95em;
  color: #ecf0f1;
  font-weight: 500;
  word-wrap: break-word;
}

.task-name-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-counts {
  display: flex;
  gap: 8px;
}

.count-item {
  font-size: 0.7em;
  color: #bdc3c7;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}

.task-count {
  background: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}

.task-item.active .task-count {
  background: #f39c12;
}

.spacer {
  flex-shrink: 0;
  height: 20px;
}

.refresh-btn {
  padding: 12px 20px;
  background: linear-gradient(90deg, #42b983 0%, #007bff 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: background 0.3s;
  width: 100%;
}

.refresh-btn:hover:not(:disabled) {
  background: linear-gradient(90deg, #3a9b72 0%, #42b983 100%);
}

.refresh-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 主要内容区域样式 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #f9f9f9;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 8px 0;
  font-size: 2.3em;
  color: #3b3b6d;
  letter-spacing: 2px;
  font-weight: 700;
}

.header p {
  margin: 0;
  font-size: 1.15em;
  color: #5a5a89;
  letter-spacing: 1px;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.control-buttons {
  display: flex;
  gap: 10px;
}

.show-all-btn {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: background 0.2s;
}

.show-all-btn:hover {
  background: #218838;
}

.display-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.display-controls label {
  color: #666;
  font-weight: 500;
  font-size: 0.95em;
}

.display-controls select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
  font-size: 0.9em;
  cursor: pointer;
  transition: border-color 0.2s;
}

.display-controls select:focus {
  outline: none;
  border-color: #007bff;
}

.stats {
  color: #666;
  font-weight: 500;
}

/* 节点图样式 */
.flowchart-canvas {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 500px;
  max-height: calc(100vh - 200px);
  overflow: hidden;
  flex: 1;
}

.node-graph-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 6px;
  min-height: 600px;
}

.status-overlay {
  position: absolute;
  top: 15px;
  right: 15px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 250, 0.95) 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 16px;
  font-size: 12px;
  z-index: 1000;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 280px;
  min-width: 240px;
}

.status-overlay h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.status-overlay h5 {
  margin: 12px 0 8px 0;
  font-size: 12px;
  color: #555;
  font-weight: 600;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  margin-bottom: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.status-label {
  color: #666;
  font-size: 11px;
  font-weight: 500;
}

.status-value {
  color: #333;
  font-size: 11px;
  font-weight: 600;
  background: rgba(0, 123, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(0, 123, 255, 0.2);
}

.operation-tips {
  border-top: 1px solid #e0e0e0;
  padding-top: 12px;
}

.operation-tips ul {
  margin: 0;
  padding-left: 16px;
  list-style: none;
}

.operation-tips li {
  margin: 4px 0;
  font-size: 10px;
  color: #666;
  position: relative;
}

.operation-tips li:before {
  content: "•";
  color: #007bff;
  font-weight: bold;
  position: absolute;
  left: -12px;
}

.connection-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.connection-path {
  filter: drop-shadow(2px 2px 4px rgba(255, 140, 0, 0.3));
  animation: flow 3s ease-in-out infinite;
}

@keyframes flow {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.resizable-node {
  position: absolute !important;
  background: white !important;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  cursor: move;
  overflow: visible !important;
  z-index: 100 !important;
  transition: box-shadow 0.3s ease;
  display: block !important;
  visibility: visible !important;
  border: 2px solid #e0e0e0;
}

.resizable-node:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  border-color: #007bff;
}

.conversation-node {
  border-left: 6px solid #42b983 !important;
}

.ai-content-node {
  border-left: 6px solid #17a2b8 !important;
}

.task-manager-node {
  border-left: 6px solid #6f42c1 !important;
}

.resize-handles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  background: #007bff;
  border: 2px solid white;
  border-radius: 50%;
  width: 12px;
  height: 12px;
  pointer-events: auto;
  cursor: pointer;
  opacity: 1; /* 让控制点始终可见 */
  transition: opacity 0.2s;
  z-index: 110;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.resizable-node:hover .resize-handle {
  opacity: 1;
  background: #ff6b00; /* 悬停时变成橙色 */
}

.resize-handle.nw { top: -6px; left: -6px; cursor: nw-resize; }
.resize-handle.ne { top: -6px; right: -6px; cursor: ne-resize; }
.resize-handle.sw { bottom: -6px; left: -6px; cursor: sw-resize; }
.resize-handle.se { bottom: -6px; right: -6px; cursor: se-resize; }
.resize-handle.n { top: -6px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
.resize-handle.s { bottom: -6px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
.resize-handle.w { top: 50%; left: -6px; transform: translateY(-50%); cursor: w-resize; }
.resize-handle.e { top: 50%; right: -6px; transform: translateY(-50%); cursor: e-resize; }

.node-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 15px;
  overflow: hidden;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f0f0;
  flex-shrink: 0;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.node-number {
  font-weight: 600;
  font-size: 1.1em;
  color: #333;
}

.node-type-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 600;
  color: white;
}

.conversation-badge {
  background: linear-gradient(90deg, #42b983 0%, #34a573 100%);
}

.ai-content-badge {
  background: linear-gradient(90deg, #17a2b8 0%, #138a9b 100%);
}

.task-manager-badge {
  background: linear-gradient(90deg, #6f42c1 0%, #5a2d91 100%);
}

.integration-analysis-badge {
  background: linear-gradient(90deg, #fd7e14 0%, #e55a00 100%);
}

.results-solutions-badge {
  background: linear-gradient(90deg, #e83e8c 0%, #c12c5f 100%);
}

.visualization-assessments-badge {
  background: linear-gradient(90deg, #20c997 0%, #17a085 100%);
}

.node-body {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 10px;
}

.node-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

/* 对话节点特定样式 */
.conversation-node-content .question-section,
.conversation-node-content .response-section {
  margin-bottom: 12px;
}

.conversation-node-content h4 {
  margin: 0 0 6px 0;
  color: #333;
  font-size: 0.95em;
  font-weight: 600;
}

.conversation-node-content .question-text {
  background: #e3f2fd;
  padding: 8px 10px;
  border-radius: 6px;
  border-left: 3px solid #2196f3;
  color: #1565c0;
  font-size: 0.9em;
  line-height: 1.4;
  max-height: 80px;
  overflow-y: auto;
}

.conversation-node-content .response-text {
  background: #e8f5e8;
  padding: 8px 10px;
  border-radius: 6px;
  border-left: 3px solid #4caf50;
  color: #2e7d32;
  font-size: 0.9em;
  line-height: 1.4;
  max-height: 100px;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* AI内容节点特定样式 */
.ai-content-node-content .content-field {
  margin-bottom: 8px;
}

.ai-content-node-content h4 {
  margin: 0 0 4px 0;
  color: #333;
  font-size: 0.85em;
  font-weight: 600;
}

.ai-content-node-content .field-text {
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  line-height: 1.3;
  border-left: 3px solid;
  max-height: 60px;
  overflow-y: auto;
}

/* TaskManager节点特定样式 */
.task-manager-node-content .content-field {
  margin-bottom: 8px;
}

.task-manager-node-content h4 {
  margin: 0 0 4px 0;
  color: #333;
  font-size: 0.85em;
  font-weight: 600;
}

.task-manager-node-content .field-text {
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  line-height: 1.3;
  border-left: 3px solid;
  max-height: 60px;
  overflow-y: auto;
}

.task-manager-node-content .task-manager-ai-response {
  background: #f8f9fa;
  max-height: 80px;
}

/* Integration Analysis节点特定样式 */
.integration-analysis-node-content {
  background: linear-gradient(135deg, #fff5ec 0%, #fff 100%);
  border: 2px solid #fd7e14;
}

.integration-analysis-node-content .node-header {
  background: linear-gradient(135deg, #fd7e14 0%, #e55a00 100%);
  color: white;
}

/* Results Solutions节点特定样式 */
.results-solutions-node-content {
  background: linear-gradient(135deg, #fdf2f8 0%, #fff 100%);
  border: 2px solid #e83e8c;
}

.results-solutions-node-content .node-header {
  background: linear-gradient(135deg, #e83e8c 0%, #c12c5f 100%);
  color: white;
}

/* Visualization Assessments节点特定样式 */
.visualization-assessments-node-content {
  background: linear-gradient(135deg, #e8f8f5 0%, #fff 100%);
  border: 2px solid #20c997;
}

.visualization-assessments-node-content .node-header {
  background: linear-gradient(135deg, #20c997 0%, #17a085 100%);
  color: white;
}

/* 导航提示样式 */
.navigation-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.1) 0%, rgba(0, 123, 255, 0.05) 100%);
  border: 1px dashed rgba(0, 123, 255, 0.3);
  border-radius: 6px;
  color: #007bff;
  font-size: 0.75em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.navigation-hint:hover {
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.15) 0%, rgba(0, 123, 255, 0.08) 100%);
  border-color: rgba(0, 123, 255, 0.5);
  transform: translateY(-1px);
}

.nav-icon {
  font-size: 1.2em;
  filter: drop-shadow(0 1px 2px rgba(0, 123, 255, 0.3));
}

/* 节点内容区域添加点击效果 */
.node-body {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 8px;
  margin: 8px -8px 10px -8px;
}

.node-body:hover {
  background: rgba(0, 123, 255, 0.03);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.latest-badge {
  background: linear-gradient(90deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.7em;
  font-weight: 600;
}

.username, .task-name {
  color: #666;
  font-size: 0.8em;
}

.copy-btn {
  padding: 6px 12px;
  background: #f8f9fa;
  color: #666;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #e9ecef;
  color: #333;
}

/* 空状态样式更新 */
.node-graph-container .empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #666;
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.debug-info {
  font-size: 0.9em;
  color: #999;
  margin-top: 10px;
  font-style: italic;
}

.content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 500px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  flex: 1;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

::-webkit-scrollbar {
  width: 8px;
  background: #e0e7ff;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #bfcfff;
  border-radius: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .flowchart-container {
    flex-direction: column;
  }
  
  .task-list {
    max-height: 120px;
  }
  
  .main-content {
    padding: 15px;
  }
  
  .header h1 {
    font-size: 1.8em;
  }
  
  .resizable-node {
    min-width: 280px;
  }
  
  .node-graph-container {
    overflow-x: auto;
  }
}
</style>
