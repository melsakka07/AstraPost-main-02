import { redirect } from "next/navigation";

export default async function CalendarPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = props.searchParams ? await props.searchParams : {};
  const searchString = new URLSearchParams();
  // Preserve all query params from the old URL, mapping the calendar view to the schedule view param
  const oldView = typeof params.view === "string" ? params.view : "month";
  searchString.set("view", oldView);
  for (const [key, value] of Object.entries(params)) {
    if (key === "view" || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) searchString.append(key, v);
    } else {
      searchString.set(key, value);
    }
  }
  redirect(`/dashboard/schedule?${searchString.toString()}`);
}
