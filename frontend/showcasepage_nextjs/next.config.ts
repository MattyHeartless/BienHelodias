import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.53"],
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
