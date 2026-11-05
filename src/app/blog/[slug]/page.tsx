import type { Metadata } from "next";
import { cache } from "react";
import { BlogPostView } from "@/components/blog/BlogPostView";
import { blogService } from "@/services/blogService";

type Props = { params: Promise<{ slug: string }> };

/**
 * Deduplicated article fetcher using React cache for Server Component & Metadata
 */
const getArticleCached = cache(async (slug: string) => {
  try {
    return await blogService.getBySlug(slug);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getArticleCached(slug);

  if (!post) {
    return {
      title: "مقاله پیدا نشد | وبلاگ سایرا",
      description: "مقاله‌ی مورد نظر یافت نشد.",
    };
  }

  const images = post.coverUrl ? [post.coverUrl] : [];

  return {
    title: `${post.title} | وبلاگ سایرا`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images,
      type: "article",
      publishedTime: post.publishedAt || undefined,
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  return <BlogPostView slug={slug} />;
}
