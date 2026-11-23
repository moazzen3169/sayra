import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.sayra-booking.ir",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "blog.sayra-booking.ir",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.sayra-booking.ir",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "sayra-booking.ir",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "sayra-booking.ir",
          },
        ],
        destination: "https://www.sayra-booking.ir/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(fonts|img|images|design)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
