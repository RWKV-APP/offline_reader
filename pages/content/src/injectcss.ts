export const injectCss = () => {
  const style = document.createElement('style');
  style.textContent = `
.rwkvLoadingSpinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: currentColor;
  animation: rwkvSpin 1s ease-in-out infinite;
  margin-left: 5px;
  vertical-align: middle;
}

@keyframes rwkvSpin {
  to {
    transform: rotate(360deg);
  }
}

.rwkvLoadingSpinner.rwkvInspecting {
  background-color: rgba(255, 0, 0, 0.5) !important;
}

.rwkvOfflineTarget {
  /*  */
}

.rwkvOfflineTarget.rwkvInspecting {
  background-color: rgba(0, 255, 255, 0.5) !important;
  outline: 1px solid rgba(0, 255, 255, 1) !important;
}

.rwkvOfflineTranslationDone {
  /*  */
}

.rwkvOfflineTranslationDone.rwkvInspecting {
  background-color: rgba(0, 0, 255, 0.5) !important;
  outline: 1px solid rgba(0, 0, 255, 1) !important;
}

.rwkvOfflineTranslationResult {
  /* 基础样式 */
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0.8;
}

/* 浅色主题下的 hover 效果 */
@media (prefers-color-scheme: light) {
  .rwkvOfflineTranslationResult:hover:not(.rwkvInspecting) {
    background-color: rgba(0, 0, 0, 0.1) !important;
    color: #1a1a1a !important;
    opacity: 1;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}

/* 深色主题下的 hover 效果 */
@media (prefers-color-scheme: dark) {
  .rwkvOfflineTranslationResult:hover:not(.rwkvInspecting) {
    background-color: rgba(255, 255, 255, 0.15) !important;
    color: #ffffff !important;
    opacity: 1;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
}

.rwkvOfflineTranslationResult.rwkvInspecting {
  background-color: rgba(0, 255, 0, 0.5) !important;
  outline: 1px solid rgba(0, 255, 0, 1) !important;
}
`;
  document.head.appendChild(style);
};
