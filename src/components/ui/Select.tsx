import { Fragment, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  leftIcon?: ReactNode;
  className?: string;
}

export function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  leftIcon,
  className,
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isOpen, setIsOpen] = useState(false);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  // Track open state and update position
  const openStateRef = useRef(false);
  const [currentOpen, setCurrentOpen] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      if (openStateRef.current) {
        updatePosition();
      }
    };
    const handleResize = () => {
      if (openStateRef.current) {
        updatePosition();
      }
    };
    
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <Listbox 
      value={value} 
      onChange={onChange} 
      disabled={disabled}
    >
      {({ open }) => {
        // Update position when opening
        if (open && !openStateRef.current) {
          openStateRef.current = true;
          setCurrentOpen(true);
          requestAnimationFrame(() => {
            updatePosition();
          });
        } else if (!open && openStateRef.current) {
          openStateRef.current = false;
          setCurrentOpen(false);
        }
        
        return (
          <>
            <div className={cn('relative', className)}>
              <Listbox.Button
                ref={buttonRef}
                className={cn(
                  'relative w-full cursor-pointer rounded-lg border px-4 py-2.5 text-left',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20',
                  'transition-all duration-200',
                  disabled
                    ? 'bg-gray-100 cursor-not-allowed opacity-50 border-gray-300 text-gray-500'
                    : 'bg-white border-primary/20 text-ink hover:border-primary/40'
                )}
              >
                <div className="flex items-center gap-2">
                  {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
                  <span className={cn('block truncate', !selectedOption && 'text-gray-400')}>
                    {selectedOption?.label || placeholder}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDown className="h-4 w-4 text-ink/60" aria-hidden="true" />
                  </span>
                </div>
              </Listbox.Button>
            </div>
            {typeof window !== 'undefined' && open && createPortal(
              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options
                  static
                  className="fixed z-[9999] mt-1 max-h-60 overflow-auto rounded-lg bg-white border border-primary/20 shadow-lg focus:outline-none"
                  style={{
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    width: `${position.width}px`,
                  }}
                >
                  {options.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className={({ active, disabled }) =>
                        cn(
                          'relative cursor-pointer select-none py-2.5 px-4',
                          active ? 'bg-primary/10 text-primary' : 'text-ink',
                          disabled && 'opacity-50 cursor-not-allowed'
                        )
                      }
                    >
                      {({ selected }) => (
                        <div className="flex items-center justify-between">
                          <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                            {option.label}
                          </span>
                          {selected && (
                            <span className="text-primary">
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>,
              document.body
            )}
          </>
        );
      }}
    </Listbox>
  );
}

export default Select;
