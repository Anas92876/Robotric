import type { ReactNode } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  /** 'danger' for destructive actions (red). */
  tone?: 'default' | 'danger';
  /** Left out of the menu entirely. */
  hidden?: boolean;
}

/** The "⋯" menu at the end of a table row: keeps rows calm, actions one click away. */
export function RowMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  const shown = actions.filter((a) => !a.hidden);
  if (shown.length === 0) return null;
  return (
    <Menu as="div" className="relative inline-block">
      <MenuButton aria-label={label} title={label} className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-rail hover:text-ink focus-visible:focus-ring data-[open]:bg-rail data-[open]:text-ink">
        <MoreHorizontal className="size-5" />
      </MenuButton>
      <MenuItems anchor="bottom end" className="z-40 min-w-44 rounded-card border border-line bg-paper p-1.5 shadow-pop [--anchor-gap:6px] focus:outline-none">
        {shown.map((a) => (
          <MenuItem key={a.label}>
            <button
              type="button"
              // Run the action after this click has finished and the menu has closed: otherwise a
              // dialog opened by the action can see the same click as an "outside click" and close
              // at once, or lose focus to the menu button
              onClick={() => setTimeout(a.onClick, 0)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-input px-3 py-2 text-start text-sm [&_svg]:size-4',
                a.tone === 'danger' ? 'text-danger data-[focus]:bg-danger-soft' : 'text-ink data-[focus]:bg-rail',
              )}
            >
              {a.icon}
              {a.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
