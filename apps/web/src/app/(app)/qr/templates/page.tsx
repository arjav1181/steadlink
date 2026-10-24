import { getCtx, listQrTemplates } from "@steadlink/data";
import { Card, QrTemplateCard } from "@steadlink/ui";

export const dynamic = "force-dynamic";

export default async function QrTemplatesPage() {
  const ctx = await getCtx();
  const templates = await listQrTemplates(ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Saved designs</h1>
        <p className="mt-1 text-sm text-muted">
          A design you use often. Apply it to a code and the code keeps pointing at the same place.
        </p>
      </div>

      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted">
            No saved designs yet. Save one from the QR designer and it will show up here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-4">
          {templates.map((template) => (
            <QrTemplateCard key={template.id} name={template.name} design={template.design} />
          ))}
        </div>
      )}
    </div>
  );
}
