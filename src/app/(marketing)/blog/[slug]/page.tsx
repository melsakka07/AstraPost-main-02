import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBlogPost } from "@/lib/blog";

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
    <article className="container mx-auto px-4 py-16 max-w-4xl space-y-8">
      <Link href="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
      </Link>

      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{post.readTime}</Badge>
          <span>•</span>
          <time>{post.date}</time>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{post.title}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{post.excerpt}</p>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
        {post.image ? (
          <Image
            src={post.image}
            alt={post.title}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5" />
        )}
      </div>

      <div className="prose prose-lg dark:prose-invert mx-auto max-w-2xl">
        {post.content}
      </div>

      <div className="border-t pt-8 mt-16 text-center space-y-6">
        <h3 className="text-2xl font-bold">Ready to grow your audience?</h3>
        <p className="text-muted-foreground">Join thousands of creators using AstroPost to scale their social presence.</p>
        <Button size="lg" asChild>
          <Link href="/login">Start Free Trial</Link>
        </Button>
      </div>
    </article>
  );
}
