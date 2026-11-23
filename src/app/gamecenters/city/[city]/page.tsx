import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DiscountedGamecenterCard } from "@/components/DiscountedGamecenterCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/seo";
import { gamecentersPageService, type GamecenterListItem } from "@/services/gamecentersPageService";

export const revalidate = 300; // 5 minutes ISR

interface Props {
  params: Promise<{ city: string }>;
}

function safeDecodeCity(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export const POPULAR_CITIES = [
  "تبریز",
  "تهران",
  "مشهد",
  "اصفهان",
  "شیراز",
  "کرج",
  "قم",
  "اهواز",
  "رشت",
  "ارومیه",
];

export async function generateStaticParams() {
  return POPULAR_CITIES.map((city) => ({
    city: encodeURIComponent(city),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const decodedCity = safeDecodeCity(city);

  if (!decodedCity) {
    return {
      title: "گیم‌نت‌ها و مراکز بازی | سایرا",
    };
  }

  const title = `گیم‌نت‌ها و مراکز بازی ${decodedCity} | رزرو آنلاین در سایرا`;
  const description = `لیست کامل بهترین گیم‌نت‌ها و کلوب‌های بازی در ${decodedCity}. مشاهده امکانات PS5، PS4، کامپیوتر گیمینگ (PC)، بیلیارد و رزرو آنلاین سانس در سایرا.`;
  const canonicalUrl = `/gamecenters/city/${encodeURIComponent(decodedCity)}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      images: [
        {
          url: `${SITE_URL}/design/sayra.svg`,
          width: 1200,
          height: 630,
          alt: `گیم‌نت‌های ${decodedCity} در سایرا`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CityGamecentersPage({ params }: Props) {
  const { city } = await params;
  const decodedCity = safeDecodeCity(city);

  if (!decodedCity) {
    notFound();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  let centers: GamecenterListItem[] = [];
  try {
    centers = await gamecentersPageService.loadAllCenters({
      city: decodedCity,
      signal: controller.signal,
    });
  } catch {
    // Fail-open
    centers = [];
  } finally {
    clearTimeout(timeoutId);
  }

  const canonicalUrl = `${SITE_URL}/gamecenters/city/${encodeURIComponent(decodedCity)}`;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "خانه",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "گیم‌نت‌ها",
          item: `${SITE_URL}/gamecenters`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: `گیم‌نت‌های ${decodedCity}`,
          item: canonicalUrl,
        },
      ],
    },
    ...(centers.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `لیست گیم‌نت‌های ${decodedCity}`,
            url: canonicalUrl,
            numberOfItems: centers.length,
            itemListElement: centers.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              url: `${SITE_URL}/gamecenter/${encodeURIComponent(item.slug || item.id)}`,
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)]">
      <JsonLd data={structuredData} />
      <Header locationName={decodedCity} />

      <main className="mx-auto flex w-full max-w-[var(--max-app-width)] flex-1 flex-col gap-6 px-4 pb-12 pt-[var(--header-m-h)] lg:gap-8 lg:px-8 lg:pt-[var(--header-h)]">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="مسیر صفحه"
          className="flex flex-wrap items-center gap-1.5 pt-2 text-xs text-[var(--text-muted)]"
        >
          <Link href="/" className="transition-colors hover:text-[var(--primary)]">
            سایرا
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href="/gamecenters"
            className="transition-colors hover:text-[var(--primary)]"
          >
            گیم‌نت‌ها
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--text-white)] font-bold">
            {decodedCity}
          </span>
        </nav>

        {/* Localized Page Header */}
        <section className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-6">
          <h1 className="text-xl font-bold text-[var(--text-white)] sm:text-2xl">
            رزرو آنلاین گیم‌نت‌های {decodedCity}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-3xl">
            مشاهده، مقایسه قیمت، سیستم‌های PS5 و کامپیوتر گیمینگ و رزرو آنلاین
            سانس در برترین گیم‌نت‌ها و مراکز بازی شهر {decodedCity}.
          </p>

          {/* Other Popular Cities quick links */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-[var(--text-muted)]">
              سایر شهرها:
            </span>
            {POPULAR_CITIES.filter((c) => c !== decodedCity).slice(0, 6).map((c) => (
              <Link
                key={c}
                href={`/gamecenters/city/${encodeURIComponent(c)}`}
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1 text-xs text-[var(--text-white)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                {c}
              </Link>
            ))}
          </div>
        </section>

        {/* Centers Grid */}
        {centers.length > 0 ? (
          <section className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {centers.map((center) => (
                <DiscountedGamecenterCard key={center.id} center={center} />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState
            title={`هنوز مرکزی در شهر ${decodedCity} ثبت نشده است`}
            description="به زودی مراکز بازی و گیم‌نت‌های این شهر به سایرا اضافه خواهند شد. اگر مدیر گیم‌نت هستید، مرکز خود را ثبت کنید."
            actionLabel="مشاهده همه گیم‌نت‌ها"
            onAction={undefined}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
