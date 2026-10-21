"use client";

import * as React from "react";

/**
 * Makes an element the trigger for a dialog.
 *
 * The element is cloned with an onClick, rather than wrapped in a span with
 * a click handler. Wrapping produces a static element with a click handler
 * around a real button: two interactive elements, one of them unreachable by
 * keyboard.
 */
export function Trigger({
  trigger,
  onClick,
}: {
  trigger: React.ReactElement<{ onClick?: () => void }>;
  onClick: () => void;
}) {
  return React.cloneElement(trigger, { onClick });
}
