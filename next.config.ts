import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  serverExternalPackages: ["fontkit", "pdfkit"],
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath: "/keyword-frequency-counter",
        assetPrefix: "/keyword-frequency-counter/",
      }
    : {}),
};

export default nextConfig;
