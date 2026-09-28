import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/** Shared look of every text box, select and text area. */
const control =
  'w-full rounded-input border border-line-strong bg-paper px-3.5 text-[15px] text-ink placeholder:text-ink-4 ' +
  'transition-[border-color,box-shadow] duration-150 focus:border-ink focus:focus-ring ' +
  'disabled:cursor-not-allowed disabled:bg-tint-sand disabled:text-ink-3 aria-[invalid=true]:border-danger';

interface FieldProps {
  label: ReactNode;
  /** Small grey text under the control. */
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  /** Receives the id the label points to and the aria props for the control. */
  children: (control: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
}

/** Label + control + hint/error, wired together for screen readers. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ms-0.5 text-danger" aria-hidden>*</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-4">{hint}</p>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(control, 'h-11', className)} {...rest} />;
});

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function SelectInput({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(control, 'h-11 cursor-pointer pe-9', className)} {...rest}>
      {children}
    </select>
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(control, 'min-h-28 py-3', className)} {...rest} />;
});
