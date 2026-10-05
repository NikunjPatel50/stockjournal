import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.swingtradinglog.com" }],
        destination: "https://swingtradinglog.com/:path*",
        permanent: true,
      },
    ];
  },
  experimental: {
    // Clarity replays fetch stylesheets later. Hashed CSS files from an
    // older deploy 404, so recordings render as unstyled HTML. Inlining
    // puts the CSS in the DOM snapshot Clarity already stores.
    inlineCss: true,
    // Pages are client components fed by providers, so a cached RSC shell
    // stays valid; revisiting a tab skips the server round trip.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "framer-motion",
      "@radix-ui/react-icons",
      "@tanstack/react-table",
      "react-day-picker",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
