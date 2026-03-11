import fs from "fs";
import path from "path";
import { compileMDX } from "next-mdx-remote/rsc";

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

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(BLOG_CONTENT_PATH, `${slug}.mdx`);
    const fileContent = fs.readFileSync(filePath, "utf8");

    const { content, frontmatter } = await compileMDX<{
      title: string;
      excerpt: string;
      date: string;
      readTime: string;
      image?: string;
    }>({
      source: fileContent,
      options: { parseFrontmatter: true },
    });

    return {
      slug,
      content,
      title: frontmatter.title,
      excerpt: frontmatter.excerpt,
      date: frontmatter.date,
      readTime: frontmatter.readTime,
      image: frontmatter.image,
    };
  } catch (error) {
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
    const post = await getBlogPost(slug);
    
    if (post) {
      posts.push({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        date: post.date,
        readTime: post.readTime,
        image: post.image,
      });
    }
  }

  // Sort by date descending
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
