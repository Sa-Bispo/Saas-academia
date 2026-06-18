import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@supabase/supabase-js",
    "react-hook-form",
    "@hookform/resolvers",
    "recharts",
    "@reduxjs/toolkit",
    "react-redux",
    "redux",
    "reselect",
    "immer",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async redirects() {
    return [
      { source: "/adega", destination: "/#adega", permanent: false },
      { source: "/lanchonete", destination: "/#lanchonete", permanent: false },
      { source: "/pizzaria", destination: "/#pizzaria", permanent: false },
    ];
  },
};

export default nextConfig;
