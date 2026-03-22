import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://rfc.local:3001", "http://127.0.0.1:3001"],
  serverExternalPackages: ["pdfmake"],
};

export default nextConfig;
