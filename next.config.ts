import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Novel_garden_map",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
