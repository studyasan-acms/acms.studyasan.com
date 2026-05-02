import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectItem } from '@/components/ui/select';

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string;
}

interface SearchablePaginatedSelectProps {
  options: SearchableSelectOption[];
  pageSize?: number;
  searchPlaceholder?: string;
  emptyLabel?: string;
}

export default function SearchablePaginatedSelect({
  options,
  pageSize = 10,
  searchPlaceholder = 'Search...',
  emptyLabel = 'No options found',
}: SearchablePaginatedSelectProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const start = (page - 1) * pageSize;
  const visibleOptions = filteredOptions.slice(start, start + pageSize);

  return (
    <>
      <div className="sticky top-0 z-10 bg-popover border-b px-2 pt-2 pb-2 space-y-2">
        {filteredOptions.length > pageSize && (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPage((prev) => Math.max(1, prev - 1));
              }}
              disabled={page === 1}
            >
              Prev
            </Button>
            <span className="text-[10px] text-gray-500 whitespace-nowrap">
              Page {page} / {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPage((prev) => Math.min(totalPages, prev + 1));
              }}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        <Input
          className="h-9 text-sm rounded-lg"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>

      <div className="pb-1">
        {visibleOptions.length > 0 ? (
          visibleOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="whitespace-normal leading-snug py-2">
              {option.label}
            </SelectItem>
          ))
        ) : (
          <div className="py-4 text-center text-xs text-gray-400">{emptyLabel}</div>
        )}
      </div>
    </>
  );
}
