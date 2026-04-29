import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, Sparkles, BookOpen, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllBlogPosts } from "@/lib/blog";
import { generateSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateSeoMetadata(
    { en: "Blog", ar: "المدونة" },
    {
      en: "Expert advice on social media growth, content creation, and building your audience in the MENA region.",
      ar: "نصائح الخبراء حول نمو وسائل التواصل الاجتماعي، وإنشاء المحتوى، وبناء جمهورك في منطقة الشرق الأوسط وشمال أفريقيا.",
    },
    { path: "/blog" }
  );
}

export default async function BlogPage() {
  const t = await getTranslations("blog");
  const posts = await getAllBlogPosts();
  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="from-primary/5 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/5 to-pink-500/5 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-purple-500/5 to-transparent blur-3xl" />
      </div>

      <div className="container mx-auto space-y-16 px-4 py-16 md:py-24">
        {/* Header */}
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge className="from-primary inline-flex items-center gap-2 border-0 bg-gradient-to-r to-purple-500 text-white transition-opacity hover:opacity-90">
            <Sparkles className="h-3.5 w-3.5" />
            {t("badge")}
          </Badge>
          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="group border-border/50 bg-card/50 relative block overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:shadow-2xl"
          >
            <div className="grid gap-0 md:grid-cols-2">
              <div className="relative aspect-[4/3] overflow-hidden md:aspect-auto">
                {featuredPost.image ? (
                  <Image
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="from-primary/20 flex h-full w-full items-center justify-center bg-gradient-to-br via-purple-500/20 to-pink-500/20">
                    <BookOpen className="text-primary/30 h-24 w-24" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    {t("featured_badge")}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col justify-center p-8 md:p-12">
                <div className="text-muted-foreground mb-4 flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {featuredPost.readTime}
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {featuredPost.date}
                  </div>
                </div>
                <h2 className="group-hover:text-primary mb-4 text-2xl font-bold transition-colors md:text-3xl">
                  {featuredPost.title}
                </h2>
                <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
                <div className="text-primary flex items-center font-medium transition-all group-hover:gap-3">
                  {t("read_featured")} <ArrowRight className="ms-2 h-4 w-4 rtl:scale-x-[-1]" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Regular Posts Grid */}
        {regularPosts.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="via-border h-px flex-1 bg-gradient-to-r from-transparent to-transparent" />
              <h2 className="text-foreground/80 text-lg font-semibold">{t("latest_articles")}</h2>
              <div className="via-border h-px flex-1 bg-gradient-to-r from-transparent to-transparent" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {regularPosts.map((post) => (
                <Link
                  href={`/blog/${post.slug}`}
                  key={post.slug}
                  className="group flex h-full flex-col"
                >
                  <div className="bg-muted border-border/50 relative mb-4 aspect-[16/10] overflow-hidden rounded-xl border">
                    {post.image ? (
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="from-primary/10 h-full w-full bg-gradient-to-br to-purple-500/10 transition-transform duration-300 group-hover:scale-105" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col space-y-3">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <span className="text-primary font-medium">{post.readTime}</span>
                      <span>•</span>
                      <time>{post.date}</time>
                    </div>
                    <h3 className="group-hover:text-primary text-lg leading-tight font-bold transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 flex-1 text-sm">
                      {post.excerpt}
                    </p>
                    <div className="text-primary flex items-center pt-2 text-sm font-medium">
                      {t("read_article")}{" "}
                      <ArrowRight className="ms-1 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter CTA */}
        <div className="border-border/50 from-muted/50 to-muted/20 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8 text-center md:p-12">
          <div className="from-primary/5 absolute inset-0 bg-gradient-to-r via-purple-500/5 to-pink-500/5" />
          <div className="absolute top-0 right-0 h-[300px] w-[300px] translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-bl from-purple-500/10 to-transparent blur-3xl" />
          <div className="relative">
            <div className="from-primary mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br to-purple-500 text-white">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="mb-4 text-2xl font-bold md:text-3xl">{t("newsletter_title")}</h3>
            <p className="text-muted-foreground mx-auto mb-8 max-w-xl">
              {t("newsletter_subtitle")}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Input
                type="email"
                placeholder={t("newsletter_placeholder")}
                disabled
                className="bg-background h-11 w-full min-w-[280px] cursor-not-allowed opacity-60 sm:w-auto"
              />
              <Button
                disabled
                className="from-primary w-full border-0 bg-gradient-to-r to-purple-500 transition-opacity sm:w-auto"
              >
                {t("newsletter_subscribe")}
              </Button>
            </div>
            <p className="text-muted-foreground mt-4 text-xs">{t("newsletter_disclaimer")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
