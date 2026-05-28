import { redirect } from "next/navigation";

export default async function QueuePage(props: {
  searchParams?: Promise<{ page?: string; [key: string]: string | string[] | undefined }>;
}) {
  const params = props.searchParams ? await props.searchParams : {};
  const searchString = new URLSearchParams();
  searchString.set("view", "list");
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
