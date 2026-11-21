import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const linkGroups = [
  {
    title: "صفحات",
    links: [
      { label: "صفحه اصلی", href: "/" },
      { label: "گیمنت‌ها", href: "/gamecenters" },
      { label: "ثبت و اتصال گیمنت", href: "/register-gamecenter" },
      { label: "وبلاگ", href: "/blog" },
      { label: "درباره ما", href: "/about" },
      { label: "قوانین و مقررات", href: "/terms" },
    ],
  },
  {
    title: "ارتباط با ما",
    links: [
      { label: "پشتیبانی", href: "/support" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      dir="rtl"
      className="relative mt-16 w-full overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--bg-body)] px-5 pt-12 pb-6 text-[var(--text-white)] sm:mt-20 sm:px-8 sm:pt-16 lg:px-16"
    >
      {/* Giant Brand */}
      <div
        dir="ltr"
        className="select-none text-left overflow-hidden pt-6 text-center text-[23vw] font-black leading-[0.85] tracking-[-0.09em] text-[var(--text-white)] sm:pt-10 sm:text-[23vw] lg:text-[22vw]"
        aria-label="SAYRA"
      >
        SAYRA<span className="text-[var(--primary)]">.</span>
      </div>

      {/* Background Glow */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-80 w-80 rounded-full bg-[var(--primary)]/[0.06] blur-[100px] sm:h-96 sm:w-96" />

      <div className="relative mx-auto max-w-[1500px]">
        {/* Main Footer */}
        <div className="grid gap-12 pb-12 sm:gap-14 sm:pb-16 lg:grid-cols-[1.1fr_1.9fr] lg:gap-20">
          {/* Brand */}
          <div className="flex flex-col items-start">
            <h2 className="text-3xl font-black leading-[1.5] tracking-tight sm:text-5xl lg:text-6xl">
              بازی بعدی،
              <br />
              <span className="text-[var(--primary)]">همین‌جاست.</span>
            </h2>

            <Link
              href="/gamecenters"
              className="group mt-6 inline-flex min-h-11 items-center gap-4 rounded-full border border-[var(--border-color)] px-5 py-2.5 text-xs transition-all duration-300 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-on-primary sm:mt-7 sm:gap-5 sm:px-6 sm:text-sm"
            >
              کشف دنیای سایرا
              <Icon
                name="arrow-left"
                size={16}
                className="text-[var(--primary)] transition-colors group-hover:text-on-primary"
              />
            </Link>
          </div>

          {/* Navigation */}
          <div className="grid grid-cols-3 gap-x-5 gap-y-10  sm:gap-x-4 sm:gap-y-12 lg:grid-cols-4 ">
            {linkGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-5 text-xs font-bold text-white sm:mb-7 sm:text-sm">
                  {group.title}
                </h3>

                <ul className="space-y-1">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex min-h-8 items-center text-xs text-gray-400 transition-colors duration-300 hover:text-[#B8F34A] sm:text-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Enamad */}
            <div className="col-span-2 flex flex-col items-start sm:col-span-1">
              <h3 className="mb-5 text-xs font-bold text-white sm:mb-7 sm:text-sm">
                نماد اعتماد
              </h3>

              <div className="flex min-h-[90px] min-w-[90px] items-center justify-center rounded-xl bg-white p-2 sm:min-h-[100px] sm:min-w-[100px]">

<div className="flex min-h-[100px] min-w-[100px] items-center justify-center rounded-xl bg-white p-2">
  <a
    href="https://trustseal.enamad.ir/?id=8726251&Code=xKo2bkBB3IMAvVqxbvnFhq7YldPQo0P2"
    target="_blank"
    rel="noopener"
    referrerPolicy="origin"
  >
    <img
      src="https://trustseal.enamad.ir/logo.aspx?id=8726251&Code=xKo2bkBB3IMAvVqxbvnFhq7YldPQo0P2"
      alt="نماد اعتماد الکترونیکی سایرا"
      width={80}
      height={80}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      referrerPolicy="origin"
      style={{
        width: "80px",
        height: "80px",
        objectFit: "contain",
        cursor: "pointer",
      }}
    />
  </a>
</div>

              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-8 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-6 sm:mt-12 sm:flex-row sm:gap-6 sm:pt-7">
          <div className="flex flex-col items-center gap-2 text-[10px] text-gray-400 sm:items-start sm:text-xs">
            <span dir="ltr">© 2026 SAYRA</span>
            <span>تمامی حقوق برای سایرا محفوظ است.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[10px] text-gray-500 sm:gap-x-7 sm:text-xs">
            <Link
              href="/terms"
              className="py-2 transition-colors hover:text-[#B8F34A]"
            >
              قوانین و مقررات
            </Link>

            <Link
              href="/privacy"
              className="py-2 transition-colors hover:text-[#B8F34A]"
            >
              حریم خصوصی
            </Link>

            <a
              href="tel:04133332211"
              dir="ltr"
              className="py-2 transition-colors hover:text-[#B8F34A]"
            >
              04133332211
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
