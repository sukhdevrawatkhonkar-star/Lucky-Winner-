
/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        // Exclude Handlebars from the server-side bundle
        if (isServer) {
            config.externals.push('handlebars');
        }
        return config;
    }
};

export default nextConfig;
