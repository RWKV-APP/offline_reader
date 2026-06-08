interface TypewriterOptions {
  write: (value: string) => void;
  isActive: () => boolean;
  intervalMs?: number;
}

interface FinishOptions {
  onDone: () => void;
}

export const createTypewriter = ({ write, isActive, intervalMs = 8 }: TypewriterOptions) => {
  let visible = '';
  let target = '';
  let timer: number | null = null;
  let finishOptions: FinishOptions | null = null;
  let stopped = false;

  const clearTimer = () => {
    if (timer === null) return;
    window.clearTimeout(timer);
    timer = null;
  };

  const writeNow = (value: string) => {
    visible = value;
    write(value);
  };

  const completeIfReady = () => {
    if (visible !== target || finishOptions === null) return;
    const { onDone } = finishOptions;
    finishOptions = null;
    onDone();
  };

  const step = () => {
    timer = null;
    if (stopped || !isActive()) {
      stopped = true;
      return;
    }

    if (visible.length < target.length) {
      const nextChar = Array.from(target.slice(visible.length))[0] ?? '';
      writeNow(visible + nextChar);
      schedule();
      return;
    }

    completeIfReady();
  };

  const schedule = () => {
    if (stopped || timer !== null) return;
    timer = window.setTimeout(step, intervalMs);
  };

  const setTarget = (value: string) => {
    if (stopped) return;
    target = value;

    if (target === visible) {
      completeIfReady();
      return;
    }

    if (!target.startsWith(visible) || visible.length > target.length) {
      writeNow(target);
      completeIfReady();
      return;
    }

    schedule();
  };

  return {
    setTarget,
    finish: (value: string, onDone: () => void) => {
      finishOptions = { onDone };
      setTarget(value);
    },
    stop: () => {
      stopped = true;
      clearTimer();
    },
  };
};
