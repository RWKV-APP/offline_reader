import { COLORS } from './const.js';
import type { ColorType, ValueOf } from './types.js';

export const colorfulLog = (message: string, type: ColorType) => {
  let color: ValueOf<typeof COLORS>;

  switch (type) {
    case 'success':
      color = COLORS.FgGreen;
      break;
    case 'info':
      color = COLORS.FgBlue;
      break;
    case 'error':
      color = COLORS.FgRed;
      break;
    case 'warning':
      color = COLORS.FgYellow;
      break;
    case 'Reset':
    case 'Bright':
    case 'Dim':
    case 'Underscore':
    case 'Blink':
    case 'Reverse':
    case 'Hidden':
    case 'FgBlack':
    case 'FgRed':
    case 'FgGreen':
    case 'FgYellow':
    case 'FgBlue':
    case 'FgMagenta':
    case 'FgCyan':
    case 'FgWhite':
    case 'BgBlack':
    case 'BgRed':
    case 'BgGreen':
    case 'BgYellow':
    case 'BgBlue':
    case 'BgMagenta':
    case 'BgCyan':
    case 'BgWhite':
      color = COLORS[type];
      break;
    default:
      throw new Error(`Unknown color type: ${type}`);
  }

  console.info(color, message);
  console.info(COLORS['Reset']);
};
