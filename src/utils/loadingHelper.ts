import { ref, computed } from 'vue'

/**
 * Loading状态管理工具
 * 提供统一的Loading状态管理和配置
 */

// Loading状态接口
export interface LoadingState {
  isRethinking: boolean
  isSubmitting: boolean
  isGenerating?: boolean
  [key: string]: boolean | undefined
}

// Loading配置接口
export interface LoadingConfig {
  background?: string
  text?: string
  spinner?: string
  customClass?: string
}

/**
 * 创建Loading状态管理
 * @returns Loading状态管理对象
 */
export function useLoading() {
  // 各种Loading状态
  const isRethinking = ref(false)
  const isSubmitting = ref(false)
  const isGenerating = ref(false)

  // 计算属性：是否有任何加载状态
  const isLoading = computed(() => {
    return isRethinking.value || isSubmitting.value || isGenerating.value
  })

  // 开始重新思考
  const startRethinking = () => {
    isRethinking.value = true
  }

  // 停止重新思考
  const stopRethinking = () => {
    isRethinking.value = false
  }

  // 开始提交
  const startSubmitting = () => {
    isSubmitting.value = true
  }

  // 停止提交
  const stopSubmitting = () => {
    isSubmitting.value = false
  }

  // 开始生成
  const startGenerating = () => {
    isGenerating.value = true
  }

  // 停止生成
  const stopGenerating = () => {
    isGenerating.value = false
  }

  // 停止所有Loading状态
  const stopAllLoading = () => {
    isRethinking.value = false
    isSubmitting.value = false
    isGenerating.value = false
  }

  // 获取按钮文本
  const getButtonText = (defaultText: string, loadingText: string, isCurrentLoading: boolean) => {
    return isCurrentLoading ? loadingText : defaultText
  }

  return {
    // 状态
    isRethinking,
    isSubmitting,
    isGenerating,
    isLoading,
    
    // 方法
    startRethinking,
    stopRethinking,
    startSubmitting,
    stopSubmitting,
    startGenerating,
    stopGenerating,
    stopAllLoading,
    getButtonText
  }
}

/**
 * 默认的Element Plus Loading配置
 */
export const defaultLoadingConfig: LoadingConfig = {
  background: 'rgba(255, 255, 255, 0.8)',
  text: '',
  spinner: '',
  customClass: ''
}

/**
 * AI思考专用Loading配置
 */
export const aiThinkingLoadingConfig: LoadingConfig = {
  background: 'rgba(255, 255, 255, 0.9)',
  text: '',
  spinner: '',
  customClass: 'ai-thinking-loading'
}

/**
 * 表单提交专用Loading配置
 */
export const formSubmitLoadingConfig: LoadingConfig = {
  background: 'rgba(255, 255, 255, 0.8)',
  text: '',
  spinner: '',
  customClass: 'form-submit-loading'
}

/**
 * 获取Loading配置属性
 * @param config Loading配置对象
 * @returns Element Plus v-loading指令所需的属性对象
 */
export function getLoadingProps(config: LoadingConfig = defaultLoadingConfig) {
  const props: Record<string, any> = {}
  
  if (config.background) {
    props['element-loading-background'] = config.background
  }
  
  if (config.text) {
    props['element-loading-text'] = config.text
  }
  
  if (config.spinner) {
    props['element-loading-spinner'] = config.spinner
  }
  
  if (config.customClass) {
    props['element-loading-custom-class'] = config.customClass
  }
  
  return props
}

/**
 * 异步操作包装器，自动管理Loading状态
 * @param loadingRef Loading状态ref
 * @param asyncOperation 异步操作函数
 */
export function withLoading<T>(
  loadingRef: { value: boolean },
  asyncOperation: () => T
): T {
  loadingRef.value = true
  try {
    const result = asyncOperation()
    return result
  } finally {
    loadingRef.value = false
  }
}

/**
 * 多个Loading状态的包装器
 * @param loadingStates Loading状态对象
 * @param activeState 当前激活的Loading状态key
 * @param asyncOperation 异步操作函数
 */
export function withMultipleLoading<T>(
  loadingStates: LoadingState,
  activeState: keyof LoadingState,
  asyncOperation: () => T
): T {
  loadingStates[activeState] = true
  try {
    const result = asyncOperation()
    return result
  } finally {
    loadingStates[activeState] = false
  }
}