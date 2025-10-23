<template>
  <div class="dialog-mode">
    <aside class="dialog-sidebar">
      <h3>历史记录</h3>
      <ul class="history">
        <li 
          v-for="(task, index) in historyTasks" 
          :key="task.id" 
          class="history-item"
        >
          <span @click="loadTaskMessages(task.name)" class="task-name">{{ task.name }}</span>
          <span class="delete-icon" @click="deleteTask(index)">🗑️</span>
        </li>
      </ul>
      <div class="spacer"></div>
      <button class="new-task-button" @click="createNewTask">新建任务</button>
    </aside>
    <section class="dialog-content">
      <h2>对话入口</h2>
      
      <div class="chat-box">
        <!-- AI思考提示 -->
        <div v-if="isThinking" class="thinking-indicator">
          <div class="thinking-avatar">AI</div>
          <div class="thinking-content">
            <div class="thinking-dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
            <span class="thinking-text">AI正在思考中...</span>
          </div>
        </div>
        
  <!-- 这里显示当前对话内容 -->
  <div v-for="(msg, index) in messages" :key="msg.id ?? index" class="message" :class="{'ai-message': msg.sender === 'AI'}">
          <div class="avatar">{{ msg.sender === 'AI' ? 'AI' : '你' }}</div>
          <textarea 
            v-if="msg.sender === 'AI'" 
            v-model="msg.text" 
            class="text"
            @blur="handleAIResponseEdit(msg)"
            :readonly="!msg.dbId"
          ></textarea>
          <p v-else class="text">{{ msg.text }}</p>
          <div v-if="msg.sender === 'AI'">
            <button @click="handleYesClick(msg.text)">是</button>
            <button @click="handleNoClick">否</button>
          </div>
          <!-- 在用户输入的问题气泡下面显示AI的思考过程 -->
          <div v-if="msg.sender === '你' && reasoningContent" class="reasoning">
            <h3>思考过程</h3>
            <pre>{{ reasoningContent }}</pre>
          </div>
        </div>
      </div>
      <div class="input-area">
        <input 
          type="text" 
          v-model="message" 
          placeholder="输入文字..." 
          :disabled="!currentTask" 
        />
        <div class="file-display" v-if="selectedFile">
          <p>文件: {{ truncatedFileName }}</p>
        </div>
        <button 
          class="voice-button" 
          @click="toggleVoiceInput" 
          :disabled="!currentTask"
          :class="{ 'recording': isRecording }"
          :title="isRecording ? '点击停止录音' : '点击开始语音输入'"
        >
          🎤
        </button>
        <button @click="sendMessage" :disabled="!currentTask">发送</button>
      </div>
      <!-- 显示流式响应结果 -->
      <div class="result">
        <!-- 如果正在加载，显示加载提示 -->
        <div v-if="streaming" class="loading">加载中...</div>
        
        <!-- 如果有思考过程，则显示 -->
        <div class="section" v-if="reasoningContent">
          <h3>思考过程</h3>
          <pre>{{ reasoningContent }}</pre>
        </div>
        
        <!-- 如果有完整回复，则显示 -->
        <div class="section" v-if="answerContent">
          <h3>完整回复</h3>
          <pre>{{ answerContent }}</pre>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: '', // 存储用户输入的消息
      messages: [], // 存储所有消息
      selectedFile: null, // 存储选中的文件
      reasoningContent: "", // 流式返回的思考过程内容
      answerContent: "", // 流式返回的完整回复内容
      streaming: false, // 标记是否正在流式接收数据
      isThinking: false, // 标记AI是否正在思考
  // 使用后端的流式代理端点；后端会将上游 SSE 原样转发
  API_URL: "/api/combined-plan/stream",
      historyTasks: [], // 历史任务列表
      currentTask: null, // 当前任务
      currentTaskId: null, // 当前任务的数据库ID
      nextMessageId: 1, // 新增消息唯一ID生成器
      isRecording: false, // 标记是否正在录音
      recognition: null, // 语音识别对象
      user: null, // 当前用户信息
    };
  },
  computed: {
    truncatedFileName() {
      if (!this.selectedFile) return '';
      const name = this.selectedFile.name;
      return name.length > 20 ? name.substring(0, 20) + '...' : name;
    }
  },
  methods: {
    // 构建结构化输出的对话消息：问题扩展 + 背景 + 研究现状
    buildStructuredMessages(question) {
      const systemPrompt = [
        '你是一名严谨的学术研究助手。',
        '请针对用户提出的问题，按以下三部分输出：',
        '## 问题扩展',
        '- 从多个角度补充与拆分问题，澄清概念与边界，给出3-5个要点；',
        '## 背景',
        '- 交代该问题的典型应用场景、涉及对象/学科、常见约束与关键变量，给出3-5个要点；',
        '## 研究现状',
        '- 概述当前主流方法与代表性方向、优缺点或适用条件，可适度提及典型研究，不需要引用格式，给出3-6个要点；',
        '要求：',
        '- 使用简体中文、简洁分点；',
        '- 标题严格使用上述三级块名；',
        '- 如信息不足，请基于常识做“合理假设”，并用“（假设）”标注；',
      ].join('\n');

      const userPrompt = [
        `用户问题：${question}`,
        '',
        '请严格按“问题扩展/背景/研究现状”三个部分与顺序输出，不要添加额外前言或总结。'
      ].join('\n');

      return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
    },
    async sendMessage() {
      if (this.message.trim()) {
        const userMsg = { 
          id: this.nextMessageId++,
          text: this.message, 
          sender: '你' 
        };
        this.messages.push(userMsg);

        // 保存用户消息到数据库
        await this.saveMessageToDatabase(userMsg);

        // 设置AI正在思考状态
        this.isThinking = true;

        try {
          const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // 前端可选提供 key；后端也有服务端环境变量兜底
              'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || localStorage.getItem('API_KEY') || ''}`,
              'Accept': 'text/event-stream'
            },
            body: JSON.stringify({
              model: "deepseek-v3",
              messages: this.buildStructuredMessages(this.message),
              max_tokens: 8000,
              stream: true,
              temperature: 0.7
            })
          });

          if (!response.ok) {
            let errorMessage = '请求失败';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error?.message || errorMessage;
            } catch (jsonError) {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
          }

          // 如果不是流式（例如后端/上游返回了JSON），走非流式兜底
          const ct = response.headers.get('content-type') || '';
          if (!response.body || ct.includes('application/json')) {
            const data = await response.json();
            const full = data?.choices?.[0]?.message?.content || '';
            const aiResponse = { id: this.nextMessageId++, text: full, sender: 'AI' };
            this.messages.push(aiResponse);
            if (aiResponse.text.trim()) {
              await this.saveMessageToDatabase(aiResponse);
            }
          } else {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let aiResponse = { id: this.nextMessageId++, text: '', sender: 'AI' };
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                const remainingLines = buffer.split('\n').filter(line => line.trim());
                for (const line of remainingLines) {
                  this.processLine(line, aiResponse);
                }
                // 保存AI回复到数据库
                if (aiResponse.text.trim()) {
                  await this.saveMessageToDatabase(aiResponse);
                  const msgIndex = this.messages.findIndex(msg => msg.id === aiResponse.id);
                  if (msgIndex !== -1) {
                    this.messages[msgIndex].dbId = aiResponse.dbId;
                  }
                }
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              const lines = buffer.split('\n');
              buffer = lines.pop();

              for (const line of lines) {
                this.processLine(line, aiResponse);
              }
            }
          }

        } catch (error) {
          console.error("请求失败:", error);
          const errorMsg = {
            id: this.nextMessageId++,
            text: `错误: ${error.message}`,
            sender: 'AI'
          };
          this.messages.push(errorMsg);
          await this.saveMessageToDatabase(errorMsg);
        } finally {
          this.isThinking = false;
        }
        this.message = '';
      }
    },

    // 加载用户的所有任务
    async loadUserTasks() {
      try {
        const response = await fetch(`/api/dialog-tasks/${this.user.id}`);
        if (response.ok) {
          const data = await response.json();
          this.historyTasks = data.tasks.map(task => ({
            id: task.id,
            name: task.task_name,
            isActive: task.is_active
          }));
          
          // 同步任务列表到localStorage，供其他组件使用
          // 按照创建时间顺序排序（最早的在前面，最新的在最后面）
          const taskNames = data.tasks
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map(task => task.task_name);
          localStorage.setItem('dialogTasks', JSON.stringify(taskNames));
          console.log('Dialog同步任务列表到localStorage:', taskNames);
        }
      } catch (error) {
        console.error('加载用户任务失败:', error);
      }
    },

    // 加载当前活跃任务
    async loadActiveTask() {
      try {
        const response = await fetch(`/api/dialog-tasks/active/${this.user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.activeTask) {
            this.currentTask = data.activeTask.task_name;
            this.currentTaskId = data.activeTask.id;
            
            // 保存当前任务到localStorage，供其他组件使用
            localStorage.setItem('currentDialogTask', data.activeTask.task_name);
            console.log('Dialog加载活跃任务:', data.activeTask.task_name);
            
            await this.loadTaskMessages(data.activeTask.task_name);
          }
        }
      } catch (error) {
        console.error('加载活跃任务失败:', error);
      }
    },

    // 加载指定任务的消息
    async loadTaskMessages(taskName) {
      try {
        const response = await fetch(`/api/dialog-messages/${this.user.id}/${encodeURIComponent(taskName)}`);
        if (response.ok) {
          const data = await response.json();
          this.messages = data.messages;
          this.currentTask = taskName;
          
          // 保存当前任务到localStorage，供其他组件使用
          localStorage.setItem('currentDialogTask', taskName);
          console.log('Dialog设置当前任务:', taskName);
          
          // 更新当前任务为活跃状态
          const task = this.historyTasks.find(t => t.name === taskName);
          if (task) {
            await this.setActiveTask(task.id);
          }
        }
      } catch (error) {
        console.error('加载任务消息失败:', error);
        this.messages = [];
      }
    },

    // 设置活跃任务
    async setActiveTask(taskId) {
      try {
        await fetch('/api/dialog-tasks/active', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: this.user.id,
            taskId: taskId
          })
        });
        this.currentTaskId = taskId;
      } catch (error) {
        console.error('设置活跃任务失败:', error);
      }
    },

    // 保存单条消息到数据库
    async saveMessageToDatabase(message) {
      try {
        const response = await fetch('/api/dialog-messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: this.user.id,
            taskName: this.currentTask,
            messageId: message.id,
            sender: message.sender,
            content: message.text
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          // 将数据库返回的ID赋值给消息对象
          message.dbId = data.id;
        }
      } catch (error) {
        console.error('保存消息到数据库失败:', error);
      }
    },

    // 处理AI回复编辑
    handleAIResponseEdit(message) {
      // 只有当消息已经保存到数据库（有dbId）时才允许更新
      if (message.dbId) {
        this.updateMessageInDatabase(message);
      } else {
        console.log('AI回复还在生成中，暂时不能编辑');
      }
    },

    // 更新消息内容
    async updateMessageInDatabase(message) {
      try {
        console.log('准备更新消息:', message);
        
        // 如果消息没有dbId，说明还未保存到数据库，跳过更新
        if (!message.dbId) {
          console.warn('消息还未保存到数据库，跳过更新');
          return;
        }
        
        console.log('发送更新请求到:', `/api/dialog-messages/${message.dbId}`);
        
        const response = await fetch(`/api/dialog-messages/${message.dbId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: message.text,
            sender: message.sender
          })
        });
        
        if (response.ok) {
          console.log('消息更新成功');
        } else {
          console.error('消息更新失败:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('更新消息失败:', error);
      }
    },

  processLine(line, aiResponse) {
      try {
        // 跳过空行和非数据行
        if (!line.trim() || !line.startsWith('data: ')) {
          return;
        }
        
        const jsonStr = line.replace('data: ', '').trim();
        
        // 跳过特殊标记
        if (jsonStr === '[DONE]' || jsonStr === '') {
          return;
        }
        
        // 尝试解析JSON
        let data;
        try {
          data = JSON.parse(jsonStr);
        } catch (parseError) {
          console.warn('跳过无效的JSON数据:', jsonStr);
          return;
        }
        
        // 处理有效的数据
        if (data.choices?.[0]?.delta?.content) {
          // 当开始接收到内容时，取消思考状态
          if (this.isThinking) {
            this.isThinking = false;
          }
          
          aiResponse.text += data.choices[0].delta.content;

          // 找到现有的AI回复消息并更新，保持其dbId
          const existingMsgIndex = this.messages.findIndex(msg => msg.id === aiResponse.id);
          if (existingMsgIndex !== -1) {
            // 保留原有的dbId
            const existingDbId = this.messages[existingMsgIndex].dbId;
            this.messages[existingMsgIndex] = { ...aiResponse, dbId: existingDbId };
          } else {
            this.messages.push({ ...aiResponse });
          }
        }
      } catch (e) {
        console.warn('处理流数据失败:', e);
      }
    },

    async createNewTask() {
      const newTaskNumber = this.historyTasks.length + 1;
      const newTaskName = `任务${newTaskNumber}`;
      
      try {
        const response = await fetch('/api/dialog-tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: this.user.id,
            taskName: newTaskName
          })
        });

        if (response.ok) {
          const data = await response.json();
          const newTask = {
            id: data.id,
            name: newTaskName,
            isActive: true
          };
          
          this.historyTasks.push(newTask);
          this.currentTask = newTaskName;
          this.currentTaskId = data.id;
          this.messages = [];
          
          // 保存当前任务到localStorage，供其他组件使用
          localStorage.setItem('currentDialogTask', newTaskName);
          console.log('Dialog创建并设置当前任务:', newTaskName);
          
          // 同步任务列表到localStorage
          const currentTasks = JSON.parse(localStorage.getItem('dialogTasks') || '[]');
          currentTasks.push(newTaskName);
          localStorage.setItem('dialogTasks', JSON.stringify(currentTasks));
          console.log('Dialog添加新任务到localStorage任务列表:', currentTasks);
        }
      } catch (error) {
        console.error('创建新任务失败:', error);
      }
    },
    async deleteTask(index) {
      const taskToDelete = this.historyTasks[index];
      
      try {
        const response = await fetch(`/api/dialog-tasks/${taskToDelete.id}?userId=${this.user.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          this.historyTasks.splice(index, 1);
          
          if (this.historyTasks.length === 0) {
            this.currentTask = null;
            this.currentTaskId = null;
            this.messages = [];
          } else if (this.currentTask === taskToDelete.name) {
            const latestTask = this.historyTasks[this.historyTasks.length - 1];
            await this.loadTaskMessages(latestTask.name);
          }
        }
      } catch (error) {
        console.error('删除任务失败:', error);
      }
    },

    handleYesClick(text) {
      // 确保跳转到 Template 页面，并传递 templateName 参数
      this.$router.push({ name: 'Template', query: { templateName: text } });
    },
    handleNoClick() {
      // 跳转到 Template 页面，但不传递 templateName 参数
      this.$router.push({ name: 'Template', query: { templateName: '' } });
    },

    // 语音输入相关方法
    initSpeechRecognition() {
      // 检查浏览器是否支持语音识别
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false; // 不持续录音
        this.recognition.interimResults = false; // 不要中间结果
        this.recognition.lang = 'zh-CN'; // 设置语言为中文
        
        // 语音识别结果处理
        this.recognition.onresult = (event) => {
          const result = event.results[0][0].transcript;
          this.message = result; // 将识别结果设置到输入框
          this.isRecording = false;
        };
        
        // 语音识别错误处理
        this.recognition.onerror = (event) => {
          console.error('语音识别错误:', event.error);
          this.isRecording = false;
          
          let errorMessage = '语音识别失败';
          switch(event.error) {
            case 'no-speech':
              errorMessage = '未检测到语音，请重试';
              break;
            case 'audio-capture':
              errorMessage = '无法访问麦克风，请检查权限';
              break;
            case 'not-allowed':
              errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问';
              break;
            case 'network':
              errorMessage = '网络错误，请检查网络连接';
              break;
          }
          
          // 显示错误提示（可以根据需要自定义提示方式）
          alert(errorMessage);
        };
        
        // 语音识别结束处理
        this.recognition.onend = () => {
          this.isRecording = false;
        };
      } else {
        console.warn('当前浏览器不支持语音识别');
      }
    },

    toggleVoiceInput() {
      if (!this.recognition) {
        alert('当前浏览器不支持语音识别功能，建议使用Chrome浏览器');
        return;
      }

      if (this.isRecording) {
        // 停止录音
        this.recognition.stop();
        this.isRecording = false;
      } else {
        // 开始录音
        try {
          this.recognition.start();
          this.isRecording = true;
        } catch (error) {
          console.error('启动语音识别失败:', error);
          alert('启动语音识别失败，请重试');
        }
      }
    }
  },
  mounted() {
    // 获取用户信息
    this.user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!this.user.id) {
      console.warn('用户未登录，跳转到登录页面');
      this.$router.push('/login');
      return;
    }
    
    this.initSpeechRecognition(); // 初始化语音识别
    this.loadUserTasks(); // 加载用户任务列表
    this.loadActiveTask(); // 加载当前活跃任务
  }
};
</script>

<style scoped>
.dialog-mode {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #e0e7ff 0%, #f9f9f9 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.dialog-sidebar {
  width: 220px;
  background: linear-gradient(135deg, #34495e 60%, #3b3b6d 100%);
  color: white;
  padding: 28px 18px 18px 18px;
  text-align: left;
  display: flex;
  flex-direction: column;
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
  box-shadow: 2px 0 8px rgba(60, 60, 120, 0.08);
}

.dialog-sidebar h3 {
  margin-top: 0;
  margin-bottom: 22px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
}

.history {
  list-style-type: none;
  padding: 0;
  margin-bottom: 18px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 10px;
  background-color: #fff;
  border-radius: 6px;
  margin-bottom: 10px;
  cursor: pointer;
  color: #333;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(60, 60, 120, 0.06);
}

.history-item:hover {
  background-color: #e0e0e0;
}

.task-name {
  flex: 1;
  font-weight: 600;
  font-size: 1.05em;
}

.delete-icon {
  color: #e74c3c;
  cursor: pointer;
  margin-left: 10px;
  font-size: 1.1em;
  transition: color 0.2s;
}

.delete-icon:hover {
  color: #c0392b;
}

.spacer {
  flex: 1;
}

.new-task-button {
  margin-bottom: 12px;
  padding: 12px 0;
  background: linear-gradient(90deg, #007bff 0%, #5a8cff 100%);
  color: white;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  font-size: 1.08em;
  font-weight: 700;
  width: 100%;
  transition: background 0.3s, box-shadow 0.3s;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
}

.new-task-button:hover {
  background: linear-gradient(90deg, #0056b3 0%, #007bff 100%);
}

.dialog-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 36px 36px 24px 36px;
  background-color: #f9f9f9;
  border-top-right-radius: 18px;
  border-bottom-right-radius: 18px;
  box-shadow: 0 2px 12px rgba(60, 60, 120, 0.06);
}

.dialog-content h2 {
  font-size: 2em;
  color: #3b3b6d;
  font-weight: 800;
  margin-bottom: 18px;
  letter-spacing: 1.5px;
}

/* 删除问题模板相关样式（button-grid / sub-buttons 等） */

.chat-box {
  flex: 1;
  margin-bottom: 20px;
  padding: 16px;
  background-color: #fff;
  border: 1.5px solid #bfcfff;
  border-radius: 10px;
  overflow-y: auto;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.06);
}

.message {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.message.ai-message {
  flex-direction: row-reverse;
}

.message.ai-message .text {
  background-color: #e0e0e0;
}

.avatar {
  width: 34px;
  height: 34px;
  background-color: #42b983;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 15px;
  font-weight: 700;
}

.message.ai-message .avatar {
  background-color: #e0e0e0;
  color: #3b3b6d;
  margin-right: 0;
  margin-left: 12px;
}

.text {
  background-color: #f1f1f1;
  padding: 12px;
  border-radius: 6px;
  flex: 1;
  font-size: 1.08em;
  color: #333;
  min-height: 32px;
  border: none;
  resize: none;
}

input.text {
  background: #f1f1f1;
}

textarea.text {
  background: #f1f1f1;
  border: none;
  resize: vertical;
  min-height: 32px;
  font-size: 1.08em;
  color: #333;
  border-radius: 6px;
  padding: 12px;
  width: 100%;
  box-sizing: border-box;
}

textarea.text:read-only {
  background: #f8f8f8;
  color: #666;
  cursor: not-allowed;
}

.message button {
  margin-left: 8px;
  margin-right: 0;
  padding: 6px 18px;
  background: linear-gradient(90deg, #007bff 0%, #5a8cff 100%);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: background 0.3s, box-shadow 0.3s;
  box-shadow: 0 1px 4px rgba(60, 60, 120, 0.06);
}

.message button:hover {
  background: linear-gradient(90deg, #0056b3 0%, #007bff 100%);
}

.thinking-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  flex-direction: row-reverse;
}

.thinking-avatar {
  width: 34px;
  height: 34px;
  background-color: #e0e0e0;
  color: #3b3b6d;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  font-size: 15px;
  font-weight: 700;
}

.thinking-content {
  background-color: #e0e0e0;
  padding: 12px;
  border-radius: 6px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.dot {
  width: 6px;
  height: 6px;
  background-color: #3b3b6d;
  border-radius: 50%;
  animation: thinking 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

.thinking-text {
  color: #3b3b6d;
  font-size: 1.08em;
}

@keyframes thinking {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.reasoning {
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: 6px;
  margin-top: 10px;
  font-size: 1em;
  color: #444;
  box-shadow: 0 1px 4px rgba(60, 60, 120, 0.04);
}

.input-area {
  display: flex;
  align-items: center;
  margin-top: 10px;
  position: relative;
  gap: 10px;
}

.input-area input {
  flex: 1;
  padding: 12px;
  border: 1.5px solid #bfcfff;
  border-radius: 6px;
  font-size: 1.08em;
  max-width: 100%;
  background: #f7fafd;
  transition: border-color 0.2s, box-shadow 0.2s;
  color: #333;
}

.input-area input:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 2px #e0e7ff;
}

.input-area button {
  padding: 12px 28px;
  background: linear-gradient(90deg, #42b983 0%, #007bff 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.08em;
  font-weight: 700;
  transition: background 0.3s, transform 0.2s;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.08);
}

.input-area button:hover {
  background: linear-gradient(90deg, #3a9b72 0%, #42b983 100%);
  transform: translateY(-2px);
}

/* 语音按钮样式 */
.voice-button {
  padding: 12px 16px !important;
  background: linear-gradient(90deg, #ff6b6b 0%, #ee5a52 100%) !important;
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em !important;
}

.voice-button:hover {
  background: linear-gradient(90deg, #ff5252 0%, #d32f2f 100%) !important;
}

.voice-button.recording {
  background: linear-gradient(90deg, #e53e3e 0%, #c53030 100%) !important;
  animation: pulse 1.5s infinite;
}

.voice-button:disabled {
  background: linear-gradient(90deg, #cccccc 0%, #999999 100%) !important;
  cursor: not-allowed;
  transform: none !important;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 107, 107, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
  }
}

.file-display {
  background-color: #f1f1f1;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 0.98em;
  color: #555;
}

.result {
  margin-top: 20px;
}

.section {
  margin-bottom: 20px;
  background: #fff;
  border-radius: 8px;
  padding: 18px 18px 12px 18px;
  box-shadow: 0 2px 8px rgba(60, 60, 120, 0.06);
}

.loading {
  color: #888;
  margin-bottom: 10px;
  font-size: 1.1em;
}

pre {
  background: #f0f0f0;
  padding: 10px;
  white-space: pre-wrap;
  border-radius: 6px;
  font-size: 1em;
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
</style>