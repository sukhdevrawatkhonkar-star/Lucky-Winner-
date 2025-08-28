/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            allowedOrigins: ["*.vercel.app", "localhost:3000"]
        }
    }
};

export default nextConfig;
