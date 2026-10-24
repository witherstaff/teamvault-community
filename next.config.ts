import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    MAX_FILE_SIZE_BYTES: process.env.MAX_FILE_SIZE_BYTES || '',
  },
};

export default nextConfig;
