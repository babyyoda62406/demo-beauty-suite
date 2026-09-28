'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'defaultValue'> {
  /** Valor controlado inicial. */
  defaultValue?: string;
  /** Se dispara tras el debounce con el término actual. */
  onSearch: (value: string) => void;
  /** Retardo del debounce en ms (por defecto 300). */
  debounceMs?: number;
  className?: string;
}

/**
 * Campo de búsqueda con icono, debounce y botón de limpiar. Emite `onSearch`
 * solo tras la pausa de tecleo para no saturar la API.
 */
export function SearchInput({
  defaultValue = '',
  onSearch,
  debounceMs = 300,
  placeholder = 'Buscar…',
  className,
  ...props
}: SearchInputProps): React.JSX.Element {
  const [value, setValue] = React.useState(defaultValue);
  const onSearchRef = React.useRef(onSearch);
  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const emit = React.useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onSearchRef.current(next), debounceMs);
    },
    [debounceMs],
  );

  React.useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.value;
    setValue(next);
    emit(next);
  };

  const handleClear = (): void => {
    setValue('');
    if (timer.current) clearTimeout(timer.current);
    onSearchRef.current('');
  };

  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft/50"
        aria-hidden="true"
      />
      <Input
        type="search"
        role="searchbox"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft/60 transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
