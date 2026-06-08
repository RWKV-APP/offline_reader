import { cn } from '@/lib/utils';
import type { ComponentPropsWithoutRef } from 'react';

type ToggleButtonProps = ComponentPropsWithoutRef<'button'>;

export const ToggleButton = ({ className, children, ...props }: ToggleButtonProps) => (
  <button
    className={cn(
      'mt-4 rounded border border-stone-300 bg-white px-4 py-1 font-bold text-stone-800 shadow-sm transition hover:bg-stone-50',
      className,
    )}
    {...props}>
    {children}
  </button>
);
