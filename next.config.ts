import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: { "/api/*": ["./src/data/catalogue.json"] },
  ...(process.env.ROADMAP_BASE_PATH
    ? { basePath: process.env.ROADMAP_BASE_PATH }
    : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
