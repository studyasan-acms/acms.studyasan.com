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
      <div className="px-2 py-1.5 sticky top-0 bg-popover border-b z-10">
        <Input
          className="h-8 text-xs"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>

      {visibleOptions.length > 0 ? (
        visibleOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))
      ) : (
        <div className="py-4 text-center text-xs text-gray-400">{emptyLabel}</div>
      )}

      {filteredOptions.length > pageSize && (
        <div className="sticky bottom-0 bg-popover border-t px-2 py-1.5 flex items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPage((prev) => Math.max(1, prev - 1));
            }}
            disabled={page === 1}
          >
            Prev
          </Button>
          <span className="text-[10px] text-gray-500">Page {page} / {totalPages}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
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
    </>
  );
}
