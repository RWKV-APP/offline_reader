import { useEffect, useState } from 'react';

export const useFullscreenDetection = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkFullscreen = () => {
      // 检查多种全屏状态
      const isFullscreenElement = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      // 检查是否处于全屏模式
      const isFullscreenMode = !!(
        (document as any).webkitIsFullScreen ||
        (document as any).mozFullScreen ||
        (document as any).msFullscreenElement
      );

      // 检查视频元素是否全屏（YouTube 等视频网站常用）
      // 使用更安全的方法检查视频全屏状态
      const videos = document.querySelectorAll('video');
      let hasFullscreenVideo = false;

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        if (
          video === document.fullscreenElement ||
          video === (document as any).webkitFullscreenElement ||
          video === (document as any).mozFullScreenElement ||
          video === (document as any).msFullscreenElement
        ) {
          hasFullscreenVideo = true;
          break;
        }
      }

      // 检查页面是否处于全屏状态
      const isPageFullscreen = window.innerHeight === window.screen.height && window.innerWidth === window.screen.width;

      setIsFullscreen(isFullscreenElement || isFullscreenMode || hasFullscreenVideo || isPageFullscreen);
    };

    // 初始检查
    checkFullscreen();

    // 监听全屏变化事件
    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];

    events.forEach(event => {
      document.addEventListener(event, checkFullscreen);
    });

    // 监听窗口大小变化（用于检测页面全屏）
    window.addEventListener('resize', checkFullscreen);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, checkFullscreen);
      });
      window.removeEventListener('resize', checkFullscreen);
    };
  }, []);

  return isFullscreen;
};
