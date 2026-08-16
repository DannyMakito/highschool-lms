import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Requests a data sync without reloading the page or interrupting in-progress forms. */
export function PortalRefreshButton() {
  const [spinning, setSpinning] = useState(false);

  const refresh = () => {
    setSpinning(true);
    window.dispatchEvent(new Event("lms:refresh"));
    window.setTimeout(() => setSpinning(false), 700);
  };

  return (
    <Button variant="ghost" size="icon" onClick={refresh} title="Refresh school data" aria-label="Refresh school data">
      <RefreshCw className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
    </Button>
  );
}
