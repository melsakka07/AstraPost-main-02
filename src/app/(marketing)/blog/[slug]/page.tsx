import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBlogPost } from "@/lib/blog";
import { BlogPostClient } from "./blog-post-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
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
      authors: ["AstroPost Team"],
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 dark:from-primary/10 dark:via-purple-500/10 dark:to-pink-500/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2" />

        <div className="container mx-auto px-4 py-12 md:py-20 max-w-4xl relative">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Blog
          </Link>

          <div className="space-y-6">
            <Badge className="bg-gradient-to-r from-primary to-purple-500 text-white border-0 hover:opacity-90 transition-opacity">
              <Sparkles className="w-3 h-3 mr-1" />
              Featured Post
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {post.title}
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed">
              {post.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-semibold">
                  A
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground font-medium">AstroPost Team</span>
                  <span className="text-xs">{post.date}</span>
                </div>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      <div className="container mx-auto px-4 max-w-4xl -mt-4">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl shadow-2xl border border-border/50 bg-muted group">
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
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <BookOpen className="w-24 h-24 text-primary/30" />
            </div>
          )}
        </div>
      </div>

      {/* Client Component for interactive elements */}
      <BlogPostClient post={post} />

      {/* Author Section */}
      <div className="container mx-auto px-4 max-w-4xl py-12">
        <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-8 border border-border/50">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg">
              A
            </div>
            <div>
              <h3 className="font-bold text-lg">Written by the AstroPost Team</h3>
              <p className="text-muted-foreground mt-2">
                We're building the best AI-powered social media management platform for content creators
                in the MENA region. Join thousands of creators scaling their presence with AstroPost.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />

        <div className="container mx-auto px-4 py-16 max-w-4xl relative">
          <div className="bg-gradient-to-br from-background to-muted/20 rounded-2xl p-8 md:p-12 border border-border/50 shadow-xl text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 text-white mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-3xl md:text-4xl font-bold">Ready to Grow Your Audience?</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of creators using AstroPost to schedule posts, analyze performance, and
              create viral content with AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 transition-opacity" asChild>
                <Link href="/login">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/features">Explore Features</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
