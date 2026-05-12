import { existsSync } from "fs";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { serialize } from "next-mdx-remote/serialize";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { logger } from "@/lib/logger";

const BLOG_CONTENT_PATH = path.join(process.cwd(), "content/blog");

const blogMdxOptions = {
  development: process.env.NODE_ENV === "development",
  jsx: false,
  format: "mdx" as const,
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
  ] as any,
};

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image?: string | undefined;
  content: any; // MDX content
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image?: string | undefined;
}

// Helper function to extract frontmatter without full MDX compilation
function extractFrontmatter(content: string) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);

  if (!match || !match[1]) return null;

  const frontmatterText = match[1];
  const frontmatter: Record<string, string> = {};

  // Simple YAML parser for frontmatter
  const lines = frontmatterText.split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

export async function getBlogPostSource(slug: string): Promise<{
  source: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image?: string | undefined;
} | null> {
  try {
    const filePath = path.join(BLOG_CONTENT_PATH, `${slug}.mdx`);
    const fileContent = await readFile(filePath, "utf8");
    const frontmatter = extractFrontmatter(fileContent);

    if (!frontmatter || !frontmatter.title) return null;

    const source = fileContent.replace(/^---[\s\S]*?---\n*/, "");

    return {
      source,
      title: frontmatter.title,
      excerpt: frontmatter.excerpt || "",
      date: frontmatter.date || "",
      readTime: frontmatter.readTime || "",
      image: frontmatter.image,
    };
  } catch {
    return null;
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(BLOG_CONTENT_PATH, `${slug}.mdx`);
    const fileContent = await readFile(filePath, "utf8");

    const mdxSource = await serialize(fileContent, {
      parseFrontmatter: true,
      mdxOptions: blogMdxOptions,
    });

    // Get frontmatter from compiled source
    const frontmatter = mdxSource.frontmatter as {
      title: string;
      excerpt: string;
      date: string;
      readTime: string;
      image?: string;
    };

    return {
      slug,
      content: mdxSource,
      title: frontmatter.title,
      excerpt: frontmatter.excerpt,
      date: frontmatter.date,
      readTime: frontmatter.readTime,
      image: frontmatter.image,
    };
  } catch (error) {
    logger.error("blog_post_compile_failed", {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getAllBlogPosts(): Promise<BlogPostMeta[]> {
  if (!existsSync(BLOG_CONTENT_PATH)) {
    return [];
  }

  const files = await readdir(BLOG_CONTENT_PATH);
  const mdxFiles = files.filter((f) => f.endsWith(".mdx"));

  const results = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace(".mdx", "");
      const filePath = path.join(BLOG_CONTENT_PATH, file);

      try {
        const fileContent = await readFile(filePath, "utf8");
        const frontmatter = extractFrontmatter(fileContent);

        if (frontmatter && frontmatter.title && frontmatter.excerpt) {
          return {
            slug,
            title: frontmatter.title,
            excerpt: frontmatter.excerpt,
            date: frontmatter.date || "",
            readTime: frontmatter.readTime || "",
            image: frontmatter.image,
          } as BlogPostMeta;
        }
      } catch (error) {
        logger.error("blog_post_read_failed", {
          slug,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    })
  );

  const posts = results.filter((p): p is BlogPostMeta => p !== null);

  // Sort by date descending
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
