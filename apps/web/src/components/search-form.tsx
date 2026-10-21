import { Search } from "lucide-react";

/**
 * A search box that submits as a plain GET form.
 *
 * It is a server component on purpose: the links page is a server component,
 * and a server component cannot hand an event handler to a client one. A GET
 * form gets the same behaviour with no client JavaScript at all.
 */
export function SearchForm({
  value,
  placeholder = "Search",
  label,
  className,
}: {
  value?: string;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  return (
    <search className={className}>
      <form action="/links">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          />
          <label htmlFor={`search-${label.replace(/\s+/g, "-").toLowerCase()}`} className="sr-only">
            {label}
          </label>
          <input
            id={`search-${label.replace(/\s+/g, "-").toLowerCase()}`}
            type="search"
            name="q"
            defaultValue={value ?? ""}
            placeholder={placeholder}
            className="h-9 w-full rounded-md border border-input bg-surface-2 pr-3 pl-9 text-sm text-foreground placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>
    </search>
  );
}
