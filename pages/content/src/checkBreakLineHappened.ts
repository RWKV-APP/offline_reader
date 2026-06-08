import { forceBreakLineTagsUpper, forceBreakLineTags } from './parseNode';

export const checkBreakLineHappened = (node: HTMLElement) => {
  const computedStyle = window.getComputedStyle(node);
  if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
    return false;
  }

  if (forceBreakLineTagsUpper.includes(node.nodeName) || forceBreakLineTags.includes(node.nodeName)) {
    return true;
  }

  // 获取文本内容
  const textContent = node.textContent?.trim();
  if (!textContent) return false;

  if (computedStyle.display === 'inline') {
    return false;
  }

  const isClippedOverflow = (value: string) => value === 'hidden' || value === 'clip';
  const hasSingleLineConstraint =
    computedStyle.whiteSpace === 'nowrap' ||
    computedStyle.textOverflow === 'ellipsis' ||
    isClippedOverflow(computedStyle.overflow) ||
    isClippedOverflow(computedStyle.overflowX) ||
    isClippedOverflow(computedStyle.overflowY);

  // 单行裁剪场景不适合直接行内追加翻译，否则尾部内容容易被宿主页面裁掉
  if (hasSingleLineConstraint) {
    return true;
  }

  // 方法2: 检查元素高度是否大于行高
  const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
  const elementHeight = node.offsetHeight;

  // 如果元素高度明显大于行高，说明发生了折行
  if (elementHeight > lineHeight * 1.5) {
    return true;
  }

  // 方法3: 检查是否有换行符
  if (textContent.includes('\n') || textContent.includes('\r')) {
    return true;
  }

  // 方法4: 检查文本长度和容器宽度的比例
  const elementWidth = node.offsetWidth;
  const fontSize = parseFloat(computedStyle.fontSize);
  const estimatedCharWidth = fontSize * 0.6; // 估算每个字符的平均宽度
  const estimatedTextWidth = textContent.length * estimatedCharWidth;

  // 如果估算的文本宽度明显大于容器宽度，很可能发生折行
  if (estimatedTextWidth > elementWidth * 1.2) {
    return true;
  }

  return false;
};
