import fs from "fs";
import path from "path";
import { serialize } from "next-mdx-remote/serialize";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { logger } from "@/lib/logger";

const BLOG_CONTENT_PATH = path.join(process.cwd(), "content/blog");

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

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(BLOG_CONTENT_PATH, `${slug}.mdx`);
    const fileContent = fs.readFileSync(filePath, "utf8");

    const mdxSource = await serialize(fileContent, {
      parseFrontmatter: true,
      mdxOptions: {
        development: process.env.NODE_ENV === "development",
        jsx: false,
        format: "mdx",
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "prepend",
              properties: {
                className: ["anchor-link"],
                ariaHidden: "true",
                tabIndex: -1,
              },
            },
          ],
        ],
      },
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
  if (!fs.existsSync(BLOG_CONTENT_PATH)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_CONTENT_PATH);
  const posts: BlogPostMeta[] = [];

  for (const file of files) {
    if (!file.endsWith(".mdx")) continue;

    const slug = file.replace(".mdx", "");
    const filePath = path.join(BLOG_CONTENT_PATH, file);

    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const frontmatter = extractFrontmatter(fileContent);

      if (frontmatter && frontmatter.title && frontmatter.excerpt) {
        posts.push({
          slug,
          title: frontmatter.title,
          excerpt: frontmatter.excerpt,
          date: frontmatter.date || "",
          readTime: frontmatter.readTime || "",
          image: frontmatter.image,
        });
      }
    } catch (error) {
      logger.error("blog_post_read_failed", {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Sort by date descending
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
