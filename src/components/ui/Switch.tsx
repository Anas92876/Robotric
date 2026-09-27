import { Switch as HeadlessSwitch } from '@headlessui/react';
import { cn } from '../../lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}: SwitchProps) {
  const sizes = {
    sm: {
      switch: 'h-5 w-9',
      thumb: 'h-4 w-4',
      translate: 'translate-x-4',
    },
    md: {
      switch: 'h-6 w-11',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5',
    },
    lg: {
      switch: 'h-7 w-14',
      thumb: 'h-6 w-6',
      translate: 'translate-x-7',
    },
  };

  const sizeConfig = sizes[size];

  return (
    <HeadlessSwitch.Group>
      <div className={cn('flex items-center', className)}>
        <HeadlessSwitch
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'relative inline-flex items-center rounded-full transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeConfig.switch,
            checked ? 'bg-primary' : 'bg-[#003300]/20'
          )}
        >
          <span
            className={cn(
              'inline-block transform rounded-full bg-white transition-transform',
              sizeConfig.thumb,
              checked ? sizeConfig.translate : 'translate-x-0.5'
            )}
          />
        </HeadlessSwitch>
        {(label || description) && (
          <HeadlessSwitch.Label className="ml-3 cursor-pointer">
            <div>
              {label && (
                <span className="text-sm font-medium text-[#003300]">
                  {label}
                </span>
              )}
              {description && (
                <p className="text-xs text-[#003300]/60 mt-0.5">{description}</p>
              )}
            </div>
          </HeadlessSwitch.Label>
        )}
      </div>
    </HeadlessSwitch.Group>
  );
}

// Switch Group for multiple related switches
export interface SwitchGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

function SwitchGroup({
  title,
  description,
  children,
  className,
}: SwitchGroupProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-base font-semibold text-[#003300]">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-[#003300]/60 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export { Switch, SwitchGroup };
export default Switch;
