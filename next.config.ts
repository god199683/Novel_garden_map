import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Nover_garden_map",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
