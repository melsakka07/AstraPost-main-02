import { redirect } from "next/navigation";

/**
 * Hub-and-spoke IA: Competitor Analyzer is now a tab on the Analytics hub.
 * This route is preserved as a redirect so any external/bookmarked links keep
 * working and resolve to the same content via `?tab=competitor`.
 */
export default function CompetitorRedirectPage() {
  redirect("/dashboard/analytics?tab=competitor");
}
