import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/keyword-frequency-counter" : "",
  assetPrefix: isGitHubPages ? "/keyword-frequency-counter/" : "",
};

export default nextConfig;
