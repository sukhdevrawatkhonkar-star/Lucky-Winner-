/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'http://127.0.0.1:9099/emulator/action:path*',
      },
    ];
  },
  experimental: {
    // This is to allow cross-origin requests from the Firebase Studio dev environment
    allowedDevOrigins: ["*.cloudworkstations.dev"],
  },
};

export default nextConfig;
