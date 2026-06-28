import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string;
}

interface SearchablePaginatedSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  pageSize?: number;
  className?: string;
  disabled?: boolean;
  triggerClassName?: string;
}

export default function SearchablePaginatedSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyLabel = 'No options found',
  pageSize = 10,
  className,
  disabled = false,
  triggerClassName,
}: SearchablePaginatedSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.searchText || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [options, search]);

  const totalPages = Math.max(1, Math.ceil(filteredOptions.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, options.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Close on outside click (but NOT on input focus / keyboard open)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  // When dropdown opens, focus the search input
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
      setPage(1);
    }
  }, [open]);

  const start = (page - 1) * pageSize;
  const visibleOptions = filteredOptions.slice(start, start + pageSize);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selectedOption && 'text-muted-foreground',
          triggerClassName
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-50 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full z-[9999] mt-1 w-full min-w-[8rem] rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{ maxHeight: '60vh', overflowY: 'auto' }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Search input — sticky at top */}
          <div
            className="sticky top-0 z-10 bg-popover border-b px-2 pt-2 pb-2 space-y-2"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Pagination controls (shown only when needed) */}
            {filteredOptions.length > pageSize && (
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px] shrink-0"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPage((prev) => Math.max(1, prev - 1)); }}
                  disabled={page === 1}
                >
                  Prev
                </Button>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">Page {page} / {totalPages}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px] shrink-0"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPage((prev) => Math.min(totalPages, prev + 1)); }}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') setOpen(false);
              }}
            />
          </div>

          {/* Options list */}
          <div className="py-1">
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                    'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                    'whitespace-normal leading-snug text-left'
                  )}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4 shrink-0', value === option.value ? 'opacity-100' : 'opacity-0')}
                  />
                  {option.label}
                </button>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-gray-400">{emptyLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
