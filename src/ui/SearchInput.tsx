import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  /** Called after the user stops typing (debounced). */
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  'aria-label'?: string;
}

/** Search box that reports its value after a short pause, so lists don't reload on every key. */
export function SearchInput({ value, onChange, placeholder, delay = 350, 'aria-label': ariaLabel }: SearchInputProps) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text), delay);
    return () => clearTimeout(t);
  }, [text, value, delay, onChange]);

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-4" aria-hidden />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-11 w-full rounded-input border border-line-strong bg-paper ps-10 pe-9 text-[15px] text-ink placeholder:text-ink-4 focus:border-ink focus:focus-ring [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button type="button" onClick={() => { setText(''); onChange(''); }} aria-label="Clear" className="absolute end-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink-4 hover:bg-ink/5 hover:text-ink">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
