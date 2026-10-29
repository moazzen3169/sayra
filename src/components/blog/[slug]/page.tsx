import type { Metadata } from "next";
import { BlogPostView } from "@/components/blog/BlogPostView";
import { findMockPost } from "@/lib/mocks/blog.mock";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // TODO: بعد از آماده شدن API، از سرویس واقعی خوانده شود
  const post = findMockPost(slug);

  if (!post) {
    return { title: "مقاله پیدا نشد | وبلاگ سایرا" };
  }

  return {
    title: `${post.title} | وبلاگ سایرا`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverUrl],
      type: "article",
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  return <BlogPostView slug={slug} />;
}