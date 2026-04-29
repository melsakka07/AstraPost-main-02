import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBlogPostSource } from "@/lib/blog";
import { getSeoLocale } from "@/lib/seo";
import { BlogPostClient } from "./blog-post-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getSeoLocale();
  const post = await getBlogPostSource(slug);

  if (!post) {
    return {
      title: locale === "ar" ? "المنشور غير موجود" : "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: ["AstraPost Team"],
      images: post.image ? [{ url: post.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.image ? [post.image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostSource(slug);

  if (!post) {
    notFound();
  }

  const t = await getTranslations("blog");

  return (
    <>
      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden">
        <div className="from-primary/5 dark:from-primary/10 absolute inset-0 bg-gradient-to-br via-purple-500/5 to-pink-500/5 dark:via-purple-500/10 dark:to-pink-500/10" />
        <div className="bg-primary/10 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />

        <div className="relative container mx-auto max-w-4xl px-4 py-12 md:py-20">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-primary group mb-8 inline-flex items-center text-sm transition-colors"
          >
            <ArrowLeft className="me-2 h-4 w-4 transition-transform group-hover:-translate-x-1 rtl:scale-x-[-1] rtl:group-hover:translate-x-1" />{" "}
            {t("back_to_blog")}
          </Link>

          <div className="space-y-6">
            <Badge className="from-primary border-0 bg-gradient-to-r to-purple-500 text-white transition-opacity hover:opacity-90">
              <Sparkles className="mr-1 h-3 w-3" />
              {t("featured_post")}
            </Badge>

            <h1 className="from-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
              {post.title}
            </h1>

            <p className="text-muted-foreground max-w-3xl text-xl leading-relaxed md:text-2xl">
              {post.excerpt}
            </p>

            <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="from-primary flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br to-purple-500 font-semibold text-white">
                  A
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground font-medium">{t("astra_team")}</span>
                  <span className="text-xs">{post.date}</span>
                </div>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      <div className="container mx-auto -mt-4 max-w-4xl px-4">
        <div className="border-border/50 bg-muted group relative aspect-[16/9] overflow-hidden rounded-2xl border shadow-2xl">
          {post.image ? (
            <Image
              src={post.image}
              alt={post.title}
              fill
              sizes="(min-width: 1024px) 896px, 100vw"
              priority
              className="object-cover"
            />
          ) : (
            <div className="from-primary/20 flex h-full w-full items-center justify-center bg-gradient-to-br via-purple-500/20 to-pink-500/20">
              <BookOpen className="text-primary/30 h-24 w-24" />
            </div>
          )}
        </div>
      </div>

      {/* Client Component for interactive elements */}
      <BlogPostClient title={post.title} excerpt={post.excerpt} slug={slug}>
        <MDXRemote
          source={post.source}
          options={{
            parseFrontmatter: false,
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [
                rehypeSlug,
                [
                  rehypeAutolinkHeadings,
                  {
                    behavior: "prepend" as const,
                    properties: {
                      className: ["anchor-link"],
                      ariaHidden: "true",
                      tabIndex: -1,
                    },
                  },
                ],
              ],
            },
          }}
        />
      </BlogPostClient>

      {/* Author Section */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="from-muted/50 to-muted/30 border-border/50 rounded-2xl border bg-gradient-to-br p-8">
          <div className="flex items-start gap-6">
            <div className="from-primary flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br to-purple-500 text-2xl font-bold text-white shadow-lg">
              A
            </div>
            <div>
              <h3 className="text-lg font-bold">{t("written_by_team")}</h3>
              <p className="text-muted-foreground mt-2">{t("team_bio")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="relative overflow-hidden">
        <div className="from-primary/10 absolute inset-0 bg-gradient-to-br via-purple-500/10 to-pink-500/10" />
        <div className="absolute right-0 bottom-0 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative container mx-auto max-w-4xl px-4 py-16">
          <div className="from-background to-muted/20 border-border/50 space-y-6 rounded-2xl border bg-gradient-to-br p-8 text-center shadow-xl md:p-12">
            <div className="from-primary mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br to-purple-500 text-white">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-3xl font-bold md:text-4xl">{t("cta_title")}</h3>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              {t("cta_description")}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
              <Button
                size="lg"
                className="from-primary bg-gradient-to-r to-purple-500 transition-opacity hover:opacity-90"
                asChild
              >
                <Link href="/login">{t("cta_start_trial")}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/features">{t("cta_explore_features")}</Link>
              </Button>
            </div>
            <div className="text-muted-foreground flex items-center justify-center gap-6 pt-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t("trust_no_card")}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t("trust_free_trial")}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t("trust_cancel")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
