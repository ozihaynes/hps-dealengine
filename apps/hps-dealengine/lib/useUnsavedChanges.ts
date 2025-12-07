import * as React from "react";

/**
 * Warn the user when navigating away (closing/reloading) with unsaved changes.
 * This only hooks into the beforeunload event; App Router navigation guards
 * are intentionally out-of-scope for this slice.
 */
export function useUnsavedChanges(isDirty: boolean) {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [isDirty]);
}
