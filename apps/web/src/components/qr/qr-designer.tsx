"use client";

import {
  Button,
  ColorPicker,
  CornerPicker,
  Field,
  FramePicker,
  LogoUploader,
  PatternPicker,
  type QrDesign,
  QrPreview,
  readImageAsDataUrl,
  Stepper,
  TextInput,
  Toggle,
} from "@golink/ui";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { createQrCodeAction, createQrTemplateAction } from "@/app/actions";

/**
 * The QR designer. Two steps, matching the original: configure the code,
 * then style it. The preview is rendered client-side from the design, so
 * dragging a colour around is instant.
 */
export function QrDesigner({
  defaultUrl,
  templates = [],
}: {
  defaultUrl: string;
  /** The designs this workspace has saved. */
  templates?: { id: string; name: string; design: QrDesign }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = React.useState(params.get("step") === "design" ? 1 : 0);
  const [longUrl, setLongUrl] = React.useState(defaultUrl);
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [withLink, setWithLink] = React.useState(true);
  const [pattern, setPattern] = React.useState<string>("rounded");
  const [corner, setCorner] = React.useState<string>("standard");
  const [dotColor, setDotColor] = React.useState("#272d36");
  const [background, setBackground] = React.useState("#ffffff");
  const [transparent, setTransparent] = React.useState(false);
  const [frame, setFrame] = React.useState("none");
  const [logo, setLogo] = React.useState<string | null>(null);
  const [overlay, setOverlay] = React.useState("");
  const [textColor, setTextColor] = React.useState("#272d36");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [templateName, setTemplateName] = React.useState("");
  const [saved, setSaved] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const design = {
    dotPattern: pattern,
    dotPatternColor: dotColor,
    backgroundColor: background,
    transparentBackground: transparent,
    cornerShapes: { topLeft: corner, topRight: corner, bottomRight: corner },
    ...(logo ? { logo } : {}),
    ...(overlay.trim() ? { text: overlay.trim(), textColor } : {}),
  };

  /** Take a saved design back into the designer. */
  function applyDesign(taken: QrDesign) {
    setPattern(taken.dotPattern ?? "rounded");
    setCorner(taken.cornerShapes?.topLeft ?? "standard");
    setDotColor(taken.dotPatternColor ?? "#272d36");
    setBackground(taken.backgroundColor ?? "#ffffff");
    setTransparent(taken.transparentBackground === true);
    setLogo(taken.logo ?? null);
    setOverlay(taken.text ?? "");
    setTextColor(taken.textColor ?? "#272d36");
    setError(null);
  }

  /** Keep this design, so it can be used again. */
  async function saveTemplate() {
    const name = templateName.trim();
    if (!name) {
      setError("Give the design a name, so you can find it again.");
      return;
    }
    setSaving(true);
    const result = await createQrTemplateAction(name, design);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "That design could not be saved.");
      return;
    }
    setSaved(name);
    setTemplateName("");
    setError(null);
  }

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

  const previewText = longUrl || "https://example.com";

  async function create() {
    setError(null);
    setBusy(true);
    const result = await createQrCodeAction({
      longUrl: longUrl.trim(),
      code: code.trim() || undefined,
      title: title.trim() || undefined,
      design,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That code could not be created.");
      return;
    }
    router.push(`/qr/${result.id}`);
  }

  return (
    <div className="space-y-6">
      <Stepper steps={["Configure code", "Customize design"]} current={step} />

      {step === 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Destination URL" htmlFor="qr-url" required>
              <TextInput
                id="qr-url"
                type="url"
                value={longUrl}
                onChange={(event) => setLongUrl(event.target.value)}
                placeholder="https://acme.studio/menu"
                required
              />
            </Field>
            <Field label="Title" htmlFor="qr-title" hint="Only you see this.">
              <TextInput
                id="qr-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Café menu"
              />
            </Field>
            <Field label="Back-half" htmlFor="qr-code" hint="Leave blank to generate one.">
              <TextInput
                id="qr-code"
                mono
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="auto"
              />
            </Field>
            <div className="rounded-md border border-border bg-surface-2 p-4">
              <Toggle
                label="Also create a short link for this code"
                checked={withLink}
                onCheckedChange={setWithLink}
              />
              <p className="mt-2 text-xs text-muted">
                A link and a code can point at the same place. The code is easier to scan; the link
                is easier to type.
              </p>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button onClick={() => setStep(1)} disabled={!longUrl.trim()}>
              Design your code
            </Button>
          </div>

          <div className="flex items-center justify-center rounded-lg bg-surface p-8 shadow-card">
            <QrPreview text={previewText} design={design} size={220} caption={previewText} />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-foreground">Pattern</h2>
              <div className="mt-3">
                <PatternPicker value={pattern} onChange={setPattern} />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-foreground">Corners</h2>
              <div className="mt-3">
                <CornerPicker value={corner} onChange={setCorner} />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-foreground">Colours</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <ColorPicker label="Dots" value={dotColor} onChange={setDotColor} />
                <ColorPicker
                  label="Background"
                  value={transparent ? "transparent" : background}
                  onChange={(value) => {
                    if (value === "transparent") {
                      setTransparent(true);
                    } else {
                      setTransparent(false);
                      setBackground(value);
                    }
                  }}
                  allowTransparent
                />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-foreground">Frame</h2>
              <div className="mt-3">
                <FramePicker value={frame} onChange={setFrame} />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-foreground">Logo</h2>
              <p className="mt-1 text-xs text-muted">
                A logo sits in the middle of the code, on a white plate. The code is built to
                survive it.
              </p>
              <div className="mt-3">
                <LogoUploader onFile={(file) => void chooseLogo(file)} />
              </div>
              {logo ? (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLogo(null)}>
                  Remove the logo
                </Button>
              ) : null}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-foreground">Text</h2>
              <p className="mt-1 text-xs text-muted">A line of text under the code.</p>
              <div className="mt-3 space-y-3">
                <Field label="Text under the code" htmlFor="qr-overlay">
                  <TextInput
                    id="qr-overlay"
                    value={overlay}
                    onChange={(event) => setOverlay(event.target.value)}
                    placeholder="Scan me for the menu"
                    maxLength={60}
                  />
                </Field>
                <ColorPicker label="Text colour" value={textColor} onChange={setTextColor} />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-foreground">Saved designs</h2>
              <p className="mt-1 text-xs text-muted">
                A design you use often. Apply it to a code and the code keeps pointing at the same
                place.
              </p>

              {templates.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      aria-label={`Apply the ${template.name} design`}
                      onClick={() => applyDesign(template.design)}
                      className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <QrPreview
                        text={previewText}
                        design={template.design}
                        size={72}
                        caption={template.name}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Nothing saved yet. A design you name below shows up here and on the saved designs
                  screen.
                </p>
              )}

              <div className="mt-3 flex items-end gap-2">
                <Field label="Name this design" htmlFor="qr-template-name">
                  <TextInput
                    id="qr-template-name"
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    placeholder="Table tent"
                    maxLength={40}
                  />
                </Field>
                <Button variant="secondary" onClick={() => void saveTemplate()} loading={saving}>
                  Save this design
                </Button>
              </div>
              {saved ? <p className="mt-2 text-sm text-success">Saved as {saved}.</p> : null}
            </section>

            <div className="rounded-md border border-border bg-surface-2 p-4">
              <Toggle
                label="Transparent background"
                checked={transparent}
                onCheckedChange={(checked) => {
                  setTransparent(checked);
                  if (!checked) setBackground("#ffffff");
                }}
              />
              <p className="mt-2 text-xs text-muted">
                Transparent codes need a dark background behind them to scan. Keep the contrast
                high.
              </p>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-surface p-8 shadow-card">
            <QrPreview text={previewText} design={design} size={240} caption={previewText} />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={create} loading={busy}>
                Create your code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
