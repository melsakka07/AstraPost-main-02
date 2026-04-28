import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { generateSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateSeoMetadata(
    { en: "Changelog", ar: "سجل التغييرات" },
    {
      en: "Stay up to date with the latest features and improvements to AstraPost.",
      ar: "ابق على اطلاع بأحدث الميزات والتحسينات في AstraPost.",
    },
    { path: "/changelog" }
  );
}

export default async function ChangelogPage() {
  const t = await getTranslations("changelog");
  const typeLabels: Record<string, string> = {
    new: t("type_new"),
    imp: t("type_imp"),
    fix: t("type_fix"),
  };
  const releases = [
    {
      version: "v1.2.0",
      date: t("release_1_date"),
      title: t("release_1_title"),
      description: t("release_1_desc"),
      changes: [
        {
          type: "new",
          content: t("release_1_item_1"),
        },
        {
          type: "new",
          content: t("release_1_item_2"),
        },
        {
          type: "new",
          content: t("release_1_item_3"),
        },
        {
          type: "new",
          content: t("release_1_item_4"),
        },
        {
          type: "new",
          content: t("release_1_item_5"),
        },
        {
          type: "new",
          content: t("release_1_item_6"),
        },
        {
          type: "new",
          content: t("release_1_item_7"),
        },
        {
          type: "new",
          content: t("release_1_item_8"),
        },
        {
          type: "imp",
          content: t("release_1_item_9"),
        },
        {
          type: "imp",
          content: t("release_1_item_10"),
        },
      ],
    },
    {
      version: "v1.1.0",
      date: t("release_2_date"),
      title: t("release_2_title"),
      description: t("release_2_desc"),
      changes: [
        { type: "new", content: t("release_2_item_1") },
        { type: "new", content: t("release_2_item_2") },
        {
          type: "new",
          content: t("release_2_item_3"),
        },
        { type: "new", content: t("release_2_item_4") },
        { type: "imp", content: t("release_2_item_5") },
        { type: "fix", content: t("release_2_item_6") },
      ],
    },
    {
      version: "v1.0.0",
      date: t("release_3_date"),
      title: t("release_3_title"),
      description: t("release_3_desc"),
      changes: [
        { type: "new", content: t("release_3_item_1") },
        { type: "new", content: t("release_3_item_2") },
        { type: "new", content: t("release_3_item_3") },
        { type: "new", content: t("release_3_item_4") },
        { type: "fix", content: t("release_3_item_5") },
      ],
    },
    {
      version: "v0.9.0",
      date: t("release_4_date"),
      title: t("release_4_title"),
      description: t("release_4_desc"),
      changes: [
        { type: "new", content: t("release_4_item_1") },
        { type: "new", content: t("release_4_item_2") },
        { type: "imp", content: t("release_4_item_3") },
      ],
    },
  ];

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="from-primary/5 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/5 to-pink-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto max-w-4xl space-y-12 px-4 py-16 md:py-24">
        {/* Header */}
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge variant="outline" className="px-4 py-1">
            {t("badge")}
          </Badge>
          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Timeline */}
        <div className="border-muted relative ml-4 space-y-12 border-l pl-8 md:ml-8 md:pl-12">
          {releases.map((release, index) => (
            <div key={index} className="relative">
              <div className="border-primary/40 bg-background ring-primary/10 absolute top-1.5 -left-[2.35rem] h-3 w-3 rounded-full border-2 ring-4 md:-left-[3.35rem]" />

              <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-baseline">
                <h2 className="text-2xl font-bold">{release.title}</h2>
                <div className="text-muted-foreground flex items-center gap-2">
                  <span className="bg-muted rounded px-2 py-0.5 font-mono text-sm">
                    {release.version}
                  </span>
                  <span>•</span>
                  <time className="text-sm">{release.date}</time>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 max-w-2xl leading-relaxed">
                {release.description}
              </p>

              <ul className="space-y-3">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Badge
                      variant={
                        change.type === "new"
                          ? "default"
                          : change.type === "fix"
                            ? "destructive"
                            : "secondary"
                      }
                      className="mt-0.5 h-5 w-12 shrink-0 justify-center px-1.5 py-0.5 text-[10px] uppercase"
                    >
                      {typeLabels[change.type]}
                    </Badge>
                    <span className="text-foreground/90 leading-relaxed">{change.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
