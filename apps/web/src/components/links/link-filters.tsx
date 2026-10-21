"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface LinkFilterOption {
  value: string;
  label: string;
}

/**
 * One filter, as a select.
 *
 * A filter is a question about the list, and the answer belongs in the
 * address: the same list can be sent to someone else, and the page comes
 * back the same way. So changing a filter changes the address rather than
 * the page behind it, and a filter that is set can be taken away again.
 */
export function LinkFilterSelect({
  name,
  label,
  value,
  options,
  anyLabel,
}: {
  name: string;
  label: string;
  value: string;
  options: LinkFilterOption[];
  anyLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function change(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(name, next);
    else params.delete(name);
    // A filter change makes the old page number meaningless.
    params.delete("cursor");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`filter-${name}`} className="text-sm text-muted">
        {label}
      </label>
      <select
        id={`filter-${name}`}
        name={name}
        value={value}
        onChange={(event) => change(event.target.value)}
        className="h-8 max-w-44 truncate rounded-sm border border-input bg-surface px-2 text-sm text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
      >
        <option value="">{anyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
