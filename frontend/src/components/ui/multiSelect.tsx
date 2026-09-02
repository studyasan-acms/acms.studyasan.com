import * as React from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: number | string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: (number | string)[];
  onSelectChange: (values: any[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  closeOnSelect?: boolean;
}

export function MultiSelect({
  options,
  selectedValues,
  onSelectChange,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  className,
  closeOnSelect = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleToggle = (value: number | string) => {
    if (selectedValues.includes(value)) {
      onSelectChange(selectedValues.filter((v) => v !== value));
    } else {
      onSelectChange([...selectedValues, value]);
    }
    if (closeOnSelect) {
      setOpen(false);
    }
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectChange(options.map((o) => o.value));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectChange([]);
  };

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm ring-offset-background placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-saBlue focus:border-saBlue disabled:cursor-not-allowed disabled:opacity-50 text-left font-normal hover:bg-slate-50 transition-all shadow-xs',
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center max-w-[85%] truncate">
            {selectedLabels.length === 0 ? (
              <span className="text-slate-400 truncate text-xs sm:text-sm">{placeholder}</span>
            ) : selectedLabels.length <= 2 ? (
              <span className="text-slate-800 font-semibold truncate text-xs sm:text-sm">
                {selectedLabels.join(', ')}
              </span>
            ) : (
              <span className="text-saBlue font-bold truncate text-xs sm:text-sm">
                {selectedLabels.length} selected
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {selectedValues.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[260px] max-w-[95vw] p-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search header */}
        <div className="flex items-center border-b border-slate-100 px-3 py-2 bg-slate-50/50">
          <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <Input
            className="flex h-8 w-full rounded-md bg-transparent text-xs outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-slate-400"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Options list */}
        <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50 overscroll-contain">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-medium">No options found.</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-xl py-2 pl-8 pr-2.5 text-xs outline-none transition-colors text-left font-medium',
                    isSelected
                      ? 'bg-saBlue/10 text-saBlue font-bold'
                      : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                  )}
                >
                  <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
                    {isSelected && <Check className="h-3.5 w-3.5 text-saBlue" />}
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer toolbar with Done button */}
        <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {options.length > 2 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-saBlue hover:underline"
              >
                Select All
              </button>
            )}
            {selectedValues.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="h-7 px-3.5 text-xs font-bold rounded-xl bg-saBlue text-white hover:bg-saBlueDark shadow-xs"
          >
            Done ✓
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
