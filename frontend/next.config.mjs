/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile)
  output: "standalone",
  // Old 8-area routes -> the 6-area model
  async redirects() {
    return [
      { source: "/career", destination: "/work", permanent: true },
      { source: "/productivity", destination: "/work", permanent: true },
      { source: "/social", destination: "/relationships", permanent: true },
      { source: "/finances", destination: "/money", permanent: true },
      { source: "/mental", destination: "/mind", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.blob.core.windows.net" },
    ],
  },
};

export default nextConfig;
