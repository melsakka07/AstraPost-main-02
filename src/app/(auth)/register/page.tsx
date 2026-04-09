import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  redirect(`/login${qs}`);
}
