import type { Metadata } from "next";
import { Suspense } from "react";import { Footer } from "@/components/Footer";
import { BlogListView } from "@/components/blog/BlogListView";

export const metadata: Metadata = {
  title: "وبلاگ | سایرا",
  description:
    "راهنما، نکته و مقاله برای رزرو بهتر گیمنت و تجربه‌ی بازی بهتر.",
};

export default function BlogPage() {
  return (
    <Suspense fallback={null}>
      <BlogListView />
      <Footer />
    </Suspense>

  );
}
