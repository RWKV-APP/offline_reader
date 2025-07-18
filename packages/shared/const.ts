export const PROJECT_URL_OBJECT = {
  url: 'https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite',
} as const;

export const ignoreHref = [
  // 🔮 LLM 相关平台
  'https://chatgpt.com',
  'https://chat.openai.com', // ✅ 实际用户更多使用此地址
  'https://chat.deepseek.com',
  'https://www.deepseek.com',
  'https://gemini.google.com/app',
  'https://www.kimi.com',
  'https://www.claude.ai',

  // 🇨🇳 中文网站（内容大概率为中文，不建议翻译）
  'https://www.163.com', // 网易
  'https://www.qq.com', // 腾讯
  'https://www.weixin.qq.com', // 微信官网
  'https://www.jd.com', // 京东
  'https://www.taobao.com', // 淘宝
  'https://www.tmall.com', // 天猫
  'https://www.sina.com.cn', // 新浪新闻
  'https://www.weibo.com', // 微博
  'https://www.zhihu.com', // 知乎
  'https://www.bilibili.com', // 哔哩哔哩
  'https://www.douyin.com', // 抖音网页版
  'https://www.kuaishou.com', // 快手
  'https://www.xhs.com', // 小红书
  'https://www.huxiu.com', // 虎嗅
  'https://www.36kr.com', // 36氪
  'https://www.cctv.com', // 央视网
  'https://www.people.com.cn', // 人民网
  'https://www.chinanews.com.cn', // 中国新闻网
  'https://www.gov.cn', // 中国政府网
  'https://www.gamersky.com', // 游民星空
  'https://t.bilibili.com', // 游民星空
  'https://zh.wikipedia.org', // 游民星空
];
