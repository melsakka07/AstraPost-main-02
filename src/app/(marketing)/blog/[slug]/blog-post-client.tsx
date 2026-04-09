"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, BookOpen } from "lucide-react";
import { MDXRemote } from "next-mdx-remote";
import type { BlogPost } from "@/lib/blog";

interface BlogPostClientProps {
  post: BlogPost;
}

// Slugify function to generate valid IDs from text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/-+/g, "-"); // Replace multiple - with single -
}

export function BlogPostClient({ post }: BlogPostClientProps) {
  const [readingProgress, setReadingProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [headings, setHeadings] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const progress = (scrolled / documentHeight) * 100;
      setReadingProgress(Math.min(progress, 100));
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;

    // Small delay to ensure MDX content is rendered
    const timer = setTimeout(() => {
      if (!contentRef.current) return;

      // Extract headings and ensure unique IDs
      const headingsElements = contentRef.current.querySelectorAll("h2, h3");
      const idCounters = new Map<string, number>();
      const headingData: Array<{ id: string; text: string; level: number }> = [];

      headingsElements.forEach((heading) => {
        const text = heading.textContent || "";
        const baseId = heading.id || slugify(text);

        // Ensure unique ID by adding counter if duplicate
        let uniqueId = baseId;
        const count = idCounters.get(baseId) || 0;
        if (count > 0) {
          uniqueId = `${baseId}-${count}`;
        }
        idCounters.set(baseId, count + 1);

        // Set the unique ID on the element
        heading.id = uniqueId;

        headingData.push({
          id: uniqueId,
          text,
          level: parseInt(heading.tagName.substring(1)),
        });
      });

      setHeadings(headingData);

      // Track active heading
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveHeading(entry.target.id);
            }
          });
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );

      headingsElements.forEach((heading) => observer.observe(heading));

      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timer);
  }, [post.slug]); // Only depend on slug to avoid re-running on content object changes

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } catch {
        // Share canceled by user
      }
    }
  };

  return (
    <>
      {/* Reading Progress Bar */}
      <div className="bg-muted fixed top-0 right-0 left-0 z-50 h-1">
        <div
          className="from-primary h-full bg-gradient-to-r via-purple-500 to-pink-500 transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Share Button - Floating */}
      <button
        onClick={handleShare}
        className="from-primary fixed right-6 bottom-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br to-purple-500 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        aria-label="Share article"
      >
        <Share2 className="h-5 w-5" />
      </button>

      {/* Table of Contents */}
      {headings.length > 0 && (
        <div className="container mx-auto mt-8 max-w-4xl px-4">
          <div className="bg-muted/30 border-border/50 rounded-xl border p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <BookOpen className="h-5 w-5" />
              Table of Contents
            </h3>
            <nav className="space-y-2">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`hover:text-primary block text-sm transition-colors ${
                    heading.level === 3 ? "text-muted-foreground pl-4" : ""
                  } ${
                    activeHeading === heading.id
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Article Content */}
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div ref={contentRef} className="prose prose-lg dark:prose-invert max-w-none">
          <MDXRemote {...post.content} />
        </div>
      </div>
    </>
  );
}
