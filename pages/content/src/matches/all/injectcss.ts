export const injectCss = () => {
  const style = document.createElement('style');
  style.textContent = `
.rwkv_loading_spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: currentColor;
  animation: rwkv_spin 1s ease-in-out infinite;
  margin-left: 5px;
  vertical-align: middle;
}

@keyframes rwkv_spin {
  to {
    transform: rotate(360deg);
  }
}

.rwkv_loading_spinner.rwkv_inspecting {
  background-color: rgba(255, 0, 0, 0.5) !important;
}

.rwkv_offline_target {
  /*  */
}

.rwkv_offline_target.rwkv_inspecting {
  background-color: rgba(0, 255, 255, 0.5) !important;
  outline: 1px solid rgba(0, 255, 255, 1) !important;
  color: rgba(255, 255, 255, 1) !important;
}

.rwkv_offline_translation_done {
  /*  */
}

.rwkv_offline_translation_done.rwkv_inspecting {
  background-color: rgba(0, 0, 255, 0.5) !important;
  outline: 1px solid rgba(0, 0, 255, 1) !important;
  color: rgba(255, 255, 255, 1) !important;
}

.rwkv_offline_translation_result {
  /*  */
}

.rwkv_offline_translation_result.rwkv_inspecting {
  background-color: rgba(0, 255, 0, 0.5) !important;
  outline: 1px solid rgba(0, 255, 0, 1) !important;
  color: rgba(255, 255, 255, 1) !important;
}


.rwkv_offline_wrapper {
  /*  */
}

.rwkv_offline_wrapper.rwkv_inspecting {
  background-color: rgba(255, 0, 0, 0.5) !important;
  outline: 1px solid rgba(255, 0, 0, 1) !important;
  color: rgba(255, 255, 255, 1) !important;
}
`;
  document.head.appendChild(style);
};
