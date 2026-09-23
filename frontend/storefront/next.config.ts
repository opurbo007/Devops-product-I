import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Local gateway (proxied inventory-service /images) + direct service.
      { protocol: "http", hostname: "localhost", port: "8081", pathname: "/api/inventory/images/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8081", pathname: "/api/inventory/images/**" },
      { protocol: "http", hostname: "localhost", port: "3001", pathname: "/images/**" },
    ],
  },
};

export default nextConfig;
