import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAllBlogPosts } from "@/lib/blog";

export default async function BlogPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="container mx-auto px-4 py-16 space-y-16">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <Badge variant="outline">Blog</Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Insights & Strategies</h1>
        <p className="text-xl text-muted-foreground">
          Expert advice on social media growth, content creation, and monetization.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {posts.map((post) => (
          <Link href={`/blog/${post.slug}`} key={post.slug} className="group cursor-pointer">
            <div className="relative aspect-video overflow-hidden rounded-xl mb-4 bg-muted">
              {post.image ? (
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 group-hover:scale-105 transition-transform duration-300" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-primary font-medium">{post.readTime}</span>
                <span>•</span>
                <time>{post.date}</time>
              </div>
              <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{post.title}</h3>
              <p className="text-muted-foreground line-clamp-2">{post.excerpt}</p>
              <div className="pt-2 flex items-center text-sm font-medium text-primary">
                Read Article <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
