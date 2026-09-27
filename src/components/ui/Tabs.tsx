import { useState } from 'react';
import type { ReactNode } from 'react';
import { Tab } from '@headlessui/react';
import { cn } from '../../lib/utils';

export interface TabItem {
  label: string;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
  variant?: 'default' | 'pills' | 'underline';
  fullWidth?: boolean;
  className?: string;
}

function Tabs({
  items,
  defaultIndex = 0,
  onChange,
  variant = 'default',
  fullWidth = false,
  className,
}: TabsProps) {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);

  const handleChange = (index: number) => {
    setSelectedIndex(index);
    onChange?.(index);
  };

  return (
    <Tab.Group selectedIndex={selectedIndex} onChange={handleChange}>
      <Tab.List
        className={cn(
          'flex gap-1',
          variant === 'underline'
            ? 'border-b border-border'
            : 'bg-surface/50 p-1 rounded-lg',
          fullWidth && 'w-full',
          className
        )}
      >
        {items.map((item, index) => (
          <Tab
            key={index}
            disabled={item.disabled}
            className={({ selected }) =>
              cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
                'transition-all duration-200 focus:outline-none',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                fullWidth && 'flex-1',
                variant === 'pills' && 'rounded-lg',
                variant === 'underline' && 'border-b-2',
                // Selected states
                selected
                  ? variant === 'pills'
                    ? 'bg-primary text-secondary'
                    : variant === 'underline'
                    ? 'border-primary text-primary'
                    : 'bg-primary text-secondary shadow-sm'
                  : variant === 'underline'
                  ? 'border-transparent text-[#003300]/60 hover:text-[#003300]'
                  : 'text-[#003300]/60 hover:text-[#003300] hover:bg-[#003300]/5'
              )
            }
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className="mt-4">
        {items.map((item, index) => (
          <Tab.Panel
            key={`${item.label}-${index}`}
            className={cn(
              'rounded-lg focus:outline-none',
              'animate-fade-in'
            )}
            style={{ 
              color: '#003300',
              position: 'relative',
              zIndex: 1,
              opacity: 1,
              visibility: 'visible'
            }}
          >
            {item.content}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
}

// Vertical Tabs variant
export interface VerticalTabsProps extends Omit<TabsProps, 'fullWidth'> {
  width?: string;
}

function VerticalTabs({
  items,
  defaultIndex = 0,
  onChange,
  variant = 'default',
  width = '200px',
  className,
}: VerticalTabsProps) {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);

  const handleChange = (index: number) => {
    setSelectedIndex(index);
    onChange?.(index);
  };

  return (
    <Tab.Group
      selectedIndex={selectedIndex}
      onChange={handleChange}
      vertical
    >
      <div className={cn('flex gap-6', className)}>
        <Tab.List
          className="flex flex-col gap-1"
          style={{ width }}
        >
          {items.map((item, index) => (
            <Tab
              key={index}
              disabled={item.disabled}
              className={({ selected }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-left',
                  'transition-all duration-200 rounded-lg focus:outline-none',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  selected
                    ? variant === 'pills'
                      ? 'bg-primary text-secondary'
                      : 'bg-primary text-secondary border-l-2 border-primary'
                    : 'text-[#003300]/60 hover:text-[#003300] hover:bg-[#003300]/5'
                )
              }
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="flex-1">
          {items.map((item, index) => (
            <Tab.Panel
              key={`${item.label}-${index}`}
              className={cn(
                'rounded-lg focus:outline-none',
                'animate-fade-in'
              )}
            >
              {item.content}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </div>
    </Tab.Group>
  );
}

export { Tabs, VerticalTabs };
export default Tabs;
