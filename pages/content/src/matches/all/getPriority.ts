const priorityMap: { [key: string]: number } = {
  'turbo-frame': 20,
  article: 40,
  main: 30,
  section: 10,
  p: 10,
  h1: 10,
  h2: 10,
  header: -10,
  footer: -10,
  comment: -20,
  nav: -20,
  sidebar: -20,
  menu: -20,
  options: -20,
  cite: -11,
};

export const getPriority = (node: HTMLElement) => {
  const nodeName = node.nodeName;
  return priorityMap[nodeName] ?? priorityMap[nodeName.toLowerCase()] ?? 0;
};
