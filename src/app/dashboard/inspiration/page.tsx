import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { InspirationContent } from "./inspiration-client";

export default function InspirationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center">
          <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
        </div>
      }
    >
      <InspirationContent />
    </Suspense>
  );
}
