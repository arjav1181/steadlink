/**
 * Reading an image a person chose.
 *
 * The logo is kept with the design, so it travels with the code wherever
 * the code goes. A data URL is the way to do that without a file system
 * and without a second table: the design is one JSON value, and the logo
 * is part of it.
 *
 * The size is capped, because a design that is mostly a picture is a
 * design nobody can load. The cap is generous for a logo and small
 * enough that the code still renders.
 */

/** The largest image that goes into a design. */
export const MAX_IMAGE_BYTES = 128 * 1024;

/** The file types a logo may be. */
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml"] as const;

/**
 * Read a chosen image as a data URL.
 *
 * Rejects an image that is too large or of a type that is not allowed, so
 * the caller can say why rather than fail later.
 */
export function readImageAsDataUrl(file: File, maxBytes = MAX_IMAGE_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
      reject(new Error("That file is not a PNG, a JPEG or an SVG."));
      return;
    }
    if (file.size > maxBytes) {
      reject(
        new Error(
          `That image is ${Math.round(file.size / 1024)} KB. The limit is ${Math.round(maxBytes / 1024)} KB.`,
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("That file could not be read."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}
