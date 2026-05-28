import { redirect } from "next/navigation";

export default async function QueuePage(props: {
  searchParams?: Promise<{ page?: string; [key: string]: string | string[] | undefined }>;
}) {
  const params = props.searchParams ? await props.searchParams : {};
  const searchString = new URLSearchParams();
  searchString.set("view", "list");
  for (const [key, value] of Object.entries(params)) {
    if (key !== "view" && typeof value === "string") {
      searchString.set(key, value);
    }
  }
  redirect(`/dashboard/schedule?${searchString.toString()}`);
}
