import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@methodslab/methods-engine", "@methodslab/video-engine", "@methodslab/visual-engine"],
};

export default nextConfig;
