import { Suspense } from "react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

// <Suspense> is required because OnboardingWizard calls useSearchParams()
// internally. Next.js 16 enforces a boundary around any component that reads
// search params to avoid blocking the static shell.
//
// Note: `dynamic({ ssr: false })` is NOT needed here. The original hydration
// mismatch was caused by the dashboard header's Radix components shifting the
// useId() counter. That layout is no longer rendered on this route — the
// onboarding shell has no Radix components, so server/client ID counters
// stay in sync naturally.
export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingWizard />
    </Suspense>
  );
}
