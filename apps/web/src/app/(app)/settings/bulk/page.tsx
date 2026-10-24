import { getCtx, listBulkUploads } from "@steadlink/data";
import { Badge, Button, Card } from "@steadlink/ui";
import { Upload } from "lucide-react";

import { BulkUploadForm } from "@/components/settings/bulk-upload-form";

import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  queued: "neutral",
  parsing: "neutral",
  processing: "warning",
  completed: "success",
  failed: "danger",
  partial: "warning",
} as const;

export default async function BulkPage() {
  const ctx = await getCtx();
  const uploads = await listBulkUploads(ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bulk uploads</h1>
        <p className="mt-1 text-sm text-muted">
          Shorten a whole spreadsheet at once. Rows that cannot be created are listed with the
          reason, and nothing is silently dropped.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Upload aria-hidden="true" className="size-4 text-muted" />
          Upload a file
        </h2>
        <p className="mt-1 text-sm text-muted">
          A CSV with a header row. It needs an <code className="font-mono">long_url</code> column,
          and may have <code className="font-mono">title</code>,{" "}
          <code className="font-mono">code</code> and <code className="font-mono">tags</code>{" "}
          columns too.
        </p>
        <BulkUploadForm />
      </Card>

      <Card className="p-0">
        {uploads.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">No uploads yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {uploads.map((upload) => (
              <li key={upload.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-foreground">{upload.filename}</span>
                  <Badge tone={STATUS_TONE[upload.status]}>{upload.status}</Badge>
                  <span className="text-sm text-muted">
                    {upload.successCount} of {upload.rowCount} created
                  </span>
                  <span className="ml-auto text-xs text-subtle">
                    {formatDateTime(upload.createdAt)}
                  </span>
                </div>
                {upload.errors.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {upload.errors.map((error) => (
                      <li key={`${error.row}-${error.code}`} className="text-sm">
                        <span className="font-mono text-xs text-danger">Row {error.row}</span>{" "}
                        <span className="text-muted">{error.message}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Button variant="ghost" asChild>
        <a href="/settings/export">Download every link as CSV</a>
      </Button>
    </div>
  );
}
