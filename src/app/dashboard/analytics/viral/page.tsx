import { redirect } from "next/navigation";

/**
 * Hub-and-spoke IA: Viral Analyzer is now a tab on the Analytics hub.
 * This route is preserved as a redirect so any external/bookmarked links keep
 * working and resolve to the same content via `?tab=viral`.
 */
export default function ViralRedirectPage() {
  redirect("/dashboard/analytics?tab=viral");
}
