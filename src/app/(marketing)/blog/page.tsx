import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, Sparkles, BookOpen, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllBlogPosts } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Expert advice on social media growth, content creation, and building your audience in the MENA region.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — AstroPost",
    description:
      "Expert advice on social media growth, content creation, and building your audience in the MENA region.",
    url: "/blog",
  },
};

export default async function BlogPage() {
  const posts = await getAllBlogPosts();
  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-purple-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <Badge className="bg-gradient-to-r from-primary to-purple-500 text-white border-0 hover:opacity-90 transition-opacity inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Blog
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Insights & Strategies
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Expert advice on social media growth, content creation, and building your audience in the MENA region.
          </p>
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="group block relative rounded-2xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300"
          >
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden">
                {featuredPost.image ? (
                  <Image
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <BookOpen className="w-24 h-24 text-primary/30" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                </div>
              </div>
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {featuredPost.readTime}
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {featuredPost.date}
                  </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center text-primary font-medium group-hover:gap-3 transition-all">
                  Read Featured Article <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Regular Posts Grid */}
        {regularPosts.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <h2 className="text-lg font-semibold text-foreground/80">Latest Articles</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <Link
                  href={`/blog/${post.slug}`}
                  key={post.slug}
                  className="group flex flex-col h-full"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl mb-4 bg-muted border border-border/50">
                    {post.image ? (
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-purple-500/10 group-hover:scale-105 transition-transform duration-300" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-primary font-medium">{post.readTime}</span>
                      <span>•</span>
                      <time>{post.date}</time>
                    </div>
                    <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-2 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="pt-2 flex items-center text-sm font-medium text-primary">
                      Read Article <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-8 md:p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 text-white mb-6">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Stay Updated</h3>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Get the latest social media tips, strategies, and insights delivered straight to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Input
                type="email"
                placeholder="Enter your email"
                className="w-full sm:w-auto min-w-[280px] h-11 bg-background"
              />
              <Button className="w-full sm:w-auto bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 transition-opacity border-0">
                Subscribe
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No spam, unsubscribe anytime. Join 5,000+ creators growing their audience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
