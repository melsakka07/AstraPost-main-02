import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

interface ChangelogEntry {
  id: string;
  title: string;
  items: string[];
  date?: string;
}

// In-memory changelog store. In the future, this could be moved to the database.
// Currently returns the latest entry to show to users on each visit.
const DEFAULT_CHANGELOG: ChangelogEntry[] = [
  {
    id: "v1.6.0",
    title: "What's New",
    date: "2026-04-17",
    items: [
      "Avatar uploads in profile settings",
      "In-app changelog and feature announcements",
      "Improved dashboard performance",
    ],
  },
];

export async function GET() {
  try {
    // Return the latest changelog entry (index 0)
    const latest = DEFAULT_CHANGELOG[0] || null;

    return Response.json({
      data: latest,
      success: true,
    });
  } catch (error) {
    logger.error("Changelog fetch error", { error });
    return ApiError.internal("Failed to fetch changelog");
  }
}
