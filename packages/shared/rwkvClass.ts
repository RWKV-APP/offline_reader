/**
 * RWKV 离线翻译插件的 CSS 类名常量
 * 这些类名用于标识和管理页面上的翻译相关元素
 */

export const rwkvClass = {
  /**
   * 加载动画的 CSS 类名
   * 用于显示翻译进行中的旋转加载图标
   * 在 injectcss.ts 中定义了旋转动画样式
   */
  spinner: 'rwkvLoadingSpinner',

  /**
   * 检查模式的 CSS 类名
   * 当插件处于检查模式时，会为相关元素添加此类名
   * 用于高亮显示翻译相关的元素，便于调试和可视化
   */
  inspect: 'rwkvInspecting',

  /**
   * 翻译目标元素的 CSS 类名
   * 标识需要被翻译的原始文本元素
   * 在 parseNode.ts 中为符合条件的文本节点添加此类名
   */
  target: 'rwkvOfflineTarget',

  /**
   * 翻译完成元素的 CSS 类名
   * 标识已经完成翻译的原始文本元素
   * 防止重复翻译同一个元素
   */
  done: 'rwkvOfflineTranslationDone',

  /**
   * 翻译结果元素的 CSS 类名
   * 标识显示翻译结果的元素
   * 翻译完成后会在原始文本旁创建此类元素来显示翻译内容
   */
  result: 'rwkvOfflineTranslationResult',
} as const;
