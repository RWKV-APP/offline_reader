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
  /*  */
}

.rwkvOfflineTranslationResult.rwkvInspecting {
  background-color: rgba(0, 255, 0, 0.5) !important;
  outline: 1px solid rgba(0, 255, 0, 1) !important;
}
`;
  document.head.appendChild(style);
};
