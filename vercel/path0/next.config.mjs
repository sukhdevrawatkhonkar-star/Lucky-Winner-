
/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        // This is to handle a warning from 'handlebars' which is a dependency of Genkit.
        // It safely ignores the 'require.extensions' warning without affecting the build.
        config.ignoreWarnings = [
            ...(config.ignoreWarnings || []),
            /require.extensions is not supported by webpack/,
        ];

        return config;
    },
};

export default nextConfig;
