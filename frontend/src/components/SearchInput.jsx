import { memo, useState, useEffect } from 'react';
import useDebounce from '../hooks/useDebounce';

/**
 * SearchInput Component
 * A labelled, debounced search box shared by the department search and the
 * in-department employee search.
 *
 * Debouncing keeps filtering responsive while typing; matching itself is done
 * by the parent against already-loaded data, so no request is issued per key.
 */
const SearchInput = memo(
  ({
    id,
    label,
    placeholder,
    onSearch,
    delay = 300,
    describedBy,
    description,
  }) => {
    const [term, setTerm] = useState('');
    const debouncedTerm = useDebounce(term, delay);

    useEffect(() => {
      // Trim here so trailing spaces never affect matching
      onSearch(debouncedTerm.trim());
    }, [debouncedTerm, onSearch]);

    return (
      <div>
        <label htmlFor={id} className="label">
          {label}
        </label>
        <div className="relative">
          <span
            className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="search"
            id={id}
            className="input pl-10 sm:pl-11 text-sm sm:text-base"
            placeholder={placeholder}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            aria-describedby={description ? describedBy : undefined}
          />
          {description && (
            <span id={describedBy} className="sr-only">
              {description}
            </span>
          )}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
