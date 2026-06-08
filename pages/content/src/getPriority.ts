const semanticPriorityMap: { [key: string]: number } = {
  h1: 48,
  h2: 42,
  h3: 36,
  h4: 30,
  h5: 24,
  h6: 20,
  article: 32,
  main: 28,
  p: 22,
  li: 18,
  dd: 16,
  dt: 16,
  blockquote: 16,
  section: 14,
  'turbo-frame': 12,
  figcaption: 6,
  figure: -10,
  cite: -12,
  header: -24,
  footer: -36,
  aside: -36,
  comment: -42,
  nav: -48,
  sidebar: -48,
  menu: -48,
  options: -48,
};

const noisyAttributePattern =
  /\b(ad|ads|aside|breadcrumb|comment|footer|header|menu|nav|promo|share|sidebar|social)\b/i;
const horizontalFocusRatio = 0.5;
const verticalFocusRatio = 0.1;

const getNodeName = (node: HTMLElement) => node.nodeName.toLowerCase();

const getTextPriority = (node: HTMLElement) => {
  const innerText = (node.innerText ?? node.textContent ?? '').trim();

  if (innerText === '') return -20;
  if (innerText.startsWith('#') || innerText.startsWith('@')) return -10;
  if (!/^[a-zA-Z]/.test(innerText)) return -10;
  if (/^(log in|login|register|share|sign in|sign up|subscribe)$/i.test(innerText)) return -18;
  if (innerText.length > 1200) return -14;
  if (innerText.length > 600) return -8;
  if (innerText.length <= 12 && !/^h[1-6]$/.test(getNodeName(node))) return -4;

  return 0;
};

const getSemanticPriority = (node: HTMLElement) => {
  let positiveScore = semanticPriorityMap[getNodeName(node)] ?? 0;
  let negativeScore = 0;
  let current: HTMLElement | null = node;

  while (current !== null) {
    const nodeName = getNodeName(current);
    const tagScore = semanticPriorityMap[nodeName] ?? 0;

    if (tagScore > positiveScore) positiveScore = tagScore;
    if (tagScore < negativeScore) negativeScore = tagScore;

    const noisyAttributes = [current.id, current.className, current.getAttribute('role') ?? '']
      .filter(value => typeof value === 'string')
      .join(' ');

    if (noisyAttributePattern.test(noisyAttributes)) {
      negativeScore = Math.min(negativeScore, -36);
    }

    current = current.parentElement;
  }

  return positiveScore + negativeScore;
};

const getViewportPriority = (node: HTMLElement) => {
  const ownerWindow = node.ownerDocument.defaultView;
  if (!ownerWindow) return 0;

  const rect = node.getBoundingClientRect();
  const viewportHeight = ownerWindow.innerHeight || node.ownerDocument.documentElement.clientHeight;
  const viewportWidth = ownerWindow.innerWidth || node.ownerDocument.documentElement.clientWidth;

  if (viewportHeight <= 0 || viewportWidth <= 0) return 0;
  if (rect.width <= 0 || rect.height <= 0) return -1000;

  const windowFocusX = viewportWidth * horizontalFocusRatio;
  const windowFocusY = viewportHeight * verticalFocusRatio;
  const elementCenterX = rect.left + rect.width / 2;
  const elementCenterY = rect.top + rect.height / 2;
  const normalizedDistanceX = Math.abs(elementCenterX - windowFocusX) / windowFocusX;
  const normalizedDistanceY = Math.abs(elementCenterY - windowFocusY) / viewportHeight;
  const normalizedDistance = Math.sqrt(normalizedDistanceX ** 2 + normalizedDistanceY ** 2);
  const offscreenPenalty =
    rect.right < 0 || rect.left > viewportWidth || rect.bottom < 0 || rect.top > viewportHeight ? 160 : 0;

  return Math.round(1000 - normalizedDistance * 240 - offscreenPenalty);
};

const getInteractionPriority = (node: HTMLElement) => {
  const activeElement = node.ownerDocument.activeElement;
  let priority = 0;

  if (activeElement !== null && (node === activeElement || node.contains(activeElement))) {
    priority += 54;
  }

  try {
    if (node.matches(':hover')) priority += 54;
  } catch {
    return priority;
  }

  return priority;
};

export const getPriority = (node: HTMLElement) =>
  getViewportPriority(node) + getSemanticPriority(node) + getTextPriority(node) + getInteractionPriority(node);
