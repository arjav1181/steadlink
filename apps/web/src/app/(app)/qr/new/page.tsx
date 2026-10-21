import { getCtx, listQrTemplates } from "@golink/data";

import { QrDesigner } from "@/components/qr/qr-designer";

export const dynamic = "force-dynamic";

export default async function NewQrCodePage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string; url?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getCtx();
  const templates = await listQrTemplates(ctx);

  return (
    <QrDesigner
      defaultUrl={params.url ?? "https://acme.studio/"}
      templates={templates.map((template) => ({
        id: template.id as string,
        name: template.name as string,
        design: (template.design ?? {}) as Record<string, unknown>,
      }))}
    />
  );
}
