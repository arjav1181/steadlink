"use client";

import type { QrDesign } from "@golink/ui";
import {
  Button,
  ColorPicker,
  CornerPicker,
  Field,
  FramePicker,
  LogoUploader,
  Modal,
  PatternPicker,
  QrPreview,
  readImageAsDataUrl,
  TextInput,
} from "@golink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";
import { updateQrCodeAction } from "@/app/actions";

export function QrEditor({
  qrId,
  design,
  title,
  shortUrl,
}: {
  qrId: string;
  design: QrDesign;
  title: string | null;
  shortUrl: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(title ?? "");
  const [pattern, setPattern] = React.useState(design.dotPattern ?? "rounded");
  const [corner, setCorner] = React.useState(design.cornerShapes?.topLeft ?? "standard");
  const [dotColor, setDotColor] = React.useState(design.dotPatternColor ?? "#272d36");
  const [background, setBackground] = React.useState(design.backgroundColor ?? "#ffffff");
  const [logo, setLogo] = React.useState<string | null>(design.logo ?? null);
  const [overlay, setOverlay] = React.useState(design.text ?? "");
  const [textColor, setTextColor] = React.useState(design.textColor ?? "#272d36");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const nextDesign = {
    dotPattern: pattern,
    dotPatternColor: dotColor,
    backgroundColor: background,
    cornerShapes: { topLeft: corner, topRight: corner, bottomRight: corner },
    ...(logo ? { logo } : {}),
    ...(overlay.trim() ? { text: overlay.trim(), textColor } : {}),
  };

  async function chooseLogo(file: File | null) {
    if (!file) {
      setLogo(null);
      return;
    }
    try {
      setLogo(await readImageAsDataUrl(file));
      setError(null);
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    const result = await updateQrCodeAction(qrId, { title: draftTitle, design: nextDesign });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Those changes could not be saved.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Edit design
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Edit the design"
        description="The code keeps pointing at the same place. Anyone who already printed it still works."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              Save the design
            </Button>
          </>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-5">
            <Field label="Title" htmlFor="qr-edit-title">
              <TextInput
                id="qr-edit-title"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
              />
            </Field>
            <div>
              <p className="text-sm font-semibold text-foreground">Pattern</p>
              <div className="mt-3">
                <PatternPicker value={pattern} onChange={setPattern} />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Corners</p>
              <div className="mt-3">
                <CornerPicker value={corner} onChange={setCorner} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorPicker label="Dots" value={dotColor} onChange={setDotColor} />
              <ColorPicker label="Background" value={background} onChange={setBackground} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Frame</p>
              <div className="mt-3">
                <FramePicker value="none" onChange={() => undefined} />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Logo</p>
              <div className="mt-3">
                <LogoUploader onFile={(file) => void chooseLogo(file)} />
              </div>
              {logo ? (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLogo(null)}>
                  Remove the logo
                </Button>
              ) : null}
            </div>
            <Field label="Text under the code" htmlFor="qr-edit-overlay">
              <TextInput
                id="qr-edit-overlay"
                value={overlay}
                onChange={(event) => setOverlay(event.target.value)}
                placeholder="Scan me for the menu"
                maxLength={60}
              />
            </Field>
            <div>
              <p className="text-sm font-semibold text-foreground">Text colour</p>
              <div className="mt-3">
                <ColorPicker label="Text" value={textColor} onChange={setTextColor} />
              </div>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-center rounded-lg bg-surface-2 p-6">
            <QrPreview text={shortUrl} design={nextDesign} size={200} />
          </div>
        </div>
      </Modal>
    </>
  );
}
