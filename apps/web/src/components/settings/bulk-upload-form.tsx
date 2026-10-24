"use client";

import { Button, Field, TextInput } from "@steadlink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { createBulkUploadAction } from "@/app/actions";

export function BulkUploadForm() {
  const router = useRouter();
  const [filename, setFilename] = React.useState("");
  const [rows, setRows] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = parseCsv(rows);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    if (parsed.rows.length === 0) {
      setError("Add at least one row under the header.");
      return;
    }
    setBusy(true);
    const result = await createBulkUploadAction(filename || "upload.csv", parsed.rows);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That upload could not be started.");
      return;
    }
    setRows("");
    setFilename("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <Field label="File name" htmlFor="bulk-filename" hint="Only for your reference.">
        <TextInput
          id="bulk-filename"
          value={filename}
          onChange={(event) => setFilename(event.target.value)}
          placeholder="spring-catalog.csv"
        />
      </Field>
      <Field
        label="Rows"
        htmlFor="bulk-rows"
        required
        hint="One link per line: long_url, then optional title, code and tags."
      >
        <textarea
          id="bulk-rows"
          value={rows}
          onChange={(event) => setRows(event.target.value)}
          rows={6}
          className="w-full rounded-md border border-input bg-surface p-3 font-mono text-sm text-foreground placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          placeholder={
            "https://acme.studio/a,Product A,product-a\nhttps://acme.studio/b,Product B,product-b"
          }
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={busy}>
        Start the upload
      </Button>
    </form>
  );
}

interface ParsedUpload {
  rows: { longUrl: string; title?: string; code?: string; tags?: string[] }[];
  /** Why the file could not be read, when it could not be read. */
  error?: string;
}

/**
 * Read the spreadsheet.
 *
 * The first line is a header, and the columns are read by their names, so
 * the order does not matter and a file with a `tags` column works.
 *
 * A row is never dropped. A row whose address is not a URL is still a row:
 * it is sent to the server, which refuses it and says which row and why.
 * A row that vanished without a word would look like a row that worked.
 */
function parseCsv(rows: string): ParsedUpload {
  const lines = rows
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], error: "Add a header line and at least one row." };
  }

  const header = lines[0]!.split(",").map((part) => part.trim().toLowerCase());
  const column = (...names: string[]) => {
    for (const name of names) {
      const index = header.indexOf(name);
      if (index >= 0) return index;
    }
    return -1;
  };

  const urlIndex = column("long_url", "long url", "url", "destination");
  if (urlIndex < 0) {
    return { rows: [], error: "The header needs a long_url column." };
  }
  const titleIndex = column("title", "name");
  const codeIndex = column("code", "back-half", "back_half", "short");
  const tagsIndex = column("tags", "tag");

  const parsed = lines.slice(1).map((line) => {
    const parts = line.split(",").map((part) => part.trim());
    const tags = tagsIndex >= 0 ? parts[tagsIndex] : undefined;
    return {
      longUrl: parts[urlIndex] ?? "",
      title: titleIndex >= 0 ? parts[titleIndex] || undefined : undefined,
      code: codeIndex >= 0 ? parts[codeIndex] || undefined : undefined,
      tags: tags
        ? tags
            .split(/[|;]/)
            .map((tag) => tag.trim())
            .filter(Boolean)
        : undefined,
    };
  });

  return { rows: parsed };
}
