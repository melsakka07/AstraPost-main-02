import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BlogPage() {
  const posts = [
    {
      title: "How to Grow from 0 to 10k Followers on X",
      excerpt: "A step-by-step guide using AstroPost's scheduling and AI tools to build an audience.",
      date: "March 1, 2026",
      category: "Growth",
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8c29jaWFsJTIwbWVkaWF8ZW58MHx8MHx8fDA%3D",
    },
    {
      title: "The Ultimate Guide to Thread Writing",
      excerpt: "Learn the anatomy of a viral thread and how to use hooks effectively.",
      date: "February 25, 2026",
      category: "Content",
      image: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d3JpdGluZ3xlbnwwfHwwfHx8MA%3D%3D",
    },
    {
      title: "Monetizing Your X Audience with Affiliate Marketing",
      excerpt: "Strategies to generate passive income without being spammy.",
      date: "February 18, 2026",
      category: "Monetization",
      image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bW9uZXl8ZW58MHx8MHx8fDA%3D",
    }
  ];

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
        {posts.map((post, index) => (
          <div key={index} className="group cursor-pointer">
            <div className="relative aspect-video overflow-hidden rounded-xl mb-4">
              <Image
                src={post.image}
                alt={post.title}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                priority={index === 0}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-primary font-medium">{post.category}</span>
                <span>•</span>
                <time>{post.date}</time>
              </div>
              <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{post.title}</h3>
              <p className="text-muted-foreground line-clamp-2">{post.excerpt}</p>
              <div className="pt-2 flex items-center text-sm font-medium text-primary">
                Read Article <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
