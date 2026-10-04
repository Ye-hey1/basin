import type { Metadata } from "next";
import { BlogIndex } from "@/components/landing/blog-index";
import { Footer } from "@/components/landing/footer";
import { breadcrumbJsonLd, JsonLd } from "@/components/landing/json-ld";
import { Navbar } from "@/components/landing/navbar";
import {
  blogPath,
  getFeaturedPost,
  getPosts,
  getUsedCategories,
} from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Round-ups, comparisons, and honest writing from the Basin team on choosing, self-hosting, and paying for project management software.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "https://basin.app/blog/rss.xml" },
  },
};

export default function Page() {
  const posts = getPosts();
  const featured = getFeaturedPost();
  const rest = posts.filter((post) => post.slug !== featured?.slug);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Basin", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Basin blog",
          url: "https://basin.app/blog",
          inLanguage: "en",
          publisher: { "@type": "Organization", name: "Basin" },
          blogPost: posts.map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            url: `https://basin.app${blogPath(post.slug)}`,
            author: { "@type": "Person", name: post.author.name },
          })),
        }}
      />
      <Navbar />
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <BlogIndex
          categories={getUsedCategories()}
          description="Round-ups and comparisons of the tools teams actually choose between, with pricing, licensing, and an honest case for each one. Written by the team behind one of them."
          eyebrow="Blog"
          featured={featured}
          posts={rest}
          title="Straight comparisons, no marketing maths"
        />
      </main>
      <Footer />
    </>
  );
}
