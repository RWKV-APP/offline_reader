const priorityMap: { [key: string]: number } = {
  'turbo-frame': 30,
  article: 20,
  main: 10,
  section: 9,
  header: -10,
  footer: -10,
  comment: -20,
  nav: -20,
  sidebar: -20,
  menu: -20,
  options: -20,
  figure: -11,
  cite: -12,
};

export const getPriority = (node: HTMLElement) => {
  const nodeName = node.nodeName;
  const innerText = node.innerText;
  let textBasedPriority = innerText.startsWith('#') ? -1 : 0;
  if (innerText.startsWith('@')) textBasedPriority = -1;
  if (!/^[a-zA-Z]/.test(innerText)) textBasedPriority = -1;
  return priorityMap[nodeName] ?? priorityMap[nodeName.toLowerCase()] ?? textBasedPriority ?? 0;
};
