"use client";

import { Button, buildMatrix, Modal, type QrDesign, QrPreview, renderQrSvg } from "@steadlink/ui";
import { Download } from "lucide-react";
import * as React from "react";

/**
 * Download the code.
 *
 * Three formats, because three different jobs want three different
 * things: a printer wants a picture, a designer wants a vector, and a
 * slide wants something small.
 *
 * The picture is drawn in the browser from the same drawing the preview
 * uses, so the file that lands on the disk is the code that was on the
 * screen — with its colours, its logo and its text — rather than a plain
 * code made from the back-half alone.
 */
export function QrDownloadButton({
  code,
  design,
  url,
}: {
  code: string;
  design?: QrDesign;
  url: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function download(format: "svg" | "png" | "jpg") {
    setBusy(format);
    setError(null);
    try {
      if (format === "svg") {
        saveBlob(new Blob([svgSource()], { type: "image/svg+xml" }), `${code}.svg`);
        return;
      }
      const blob = await rasterImage(format);
      saveBlob(blob, `${code}.${format}`);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(null);
    }
  }

  /** The drawing, without the logo: the logo is put on afterwards. */
  function svgSource() {
    return renderQrSvg({
      text: url,
      design: design ? { ...design, logo: undefined } : undefined,
      size: 1024,
      title: `QR code for ${code}`,
    });
  }

  async function rasterImage(format: "png" | "jpg"): Promise<Blob> {
    const size = 1024;
    const matrix = buildMatrix(url);
    const total = (matrix.size + 8) * 4;
    const band = design?.text?.trim() ? Math.max(28, Math.round(total * 0.14)) : 0;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = Math.round((size * (total + band)) / total);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot draw the code.");

    // A picture file has no transparency, so the paper behind the code is
    // white whether the design asked for a transparent background or not.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const drawing = await loadImage(svgSource());
    context.drawImage(drawing, 0, 0, canvas.width, canvas.height);

    if (design?.logo) {
      const logo = await loadImage(design.logo);
      const scale = canvas.width / total;
      const plate = total * 0.24 * scale;
      const pad = plate * 0.1;
      const x = (canvas.width - plate) / 2;
      const y = (canvas.width - plate) / 2;
      context.fillStyle = "#ffffff";
      roundedRect(context, x, y, plate, plate, plate * 0.14);
      context.fill();
      context.drawImage(logo, x + pad, y + pad, plate - pad * 2, plate - pad * 2);
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format === "png" ? "image/png" : "image/jpeg", 0.92),
    );
    if (!blob) throw new Error("The picture could not be made. Try the SVG.");
    return blob;
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        icon={<Download aria-hidden="true" className="size-4" />}
      >
        Download
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Download the code"
        description="The file is drawn from this design, so it looks the way the code looks here."
        footer={
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex items-center justify-center rounded-lg bg-surface-2 p-6">
            <QrPreview text={url} design={design} size={200} />
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted">
              A vector file scales without going soft. A picture file is what a printer wants.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={() => void download("svg")}
                loading={busy === "svg"}
                disabled={busy !== null && busy !== "svg"}
              >
                Download SVG
              </Button>
              <Button
                variant="secondary"
                onClick={() => void download("png")}
                loading={busy === "png"}
                disabled={busy !== null && busy !== "png"}
              >
                Download PNG
              </Button>
              <Button
                variant="secondary"
                onClick={() => void download("jpg")}
                loading={busy === "jpg"}
                disabled={busy !== null && busy !== "jpg"}
              >
                Download JPEG
              </Button>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Hand a file to the browser's download machinery. */
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Load a picture from a string of SVG or a data URL. */
function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The code could not be drawn."));
    image.src = source.startsWith("data:")
      ? source
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  });
}

/** A rectangle with rounded corners, for the plate under a logo. */
function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  if (typeof context.roundRect === "function") {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    return;
  }
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
