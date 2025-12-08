import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hcdcxznwnzdhomvmpotr.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;
    
    // Suppress webpack cache serialization warnings
    if (!isServer) {
      config.cache = {
        ...config.cache,
        compression: 'gzip',
      };
    }
    
    // Suppress infrastructure logging warnings
    config.infrastructureLogging = {
      level: 'error',
    };
    
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "masterly",
  project: "masterly-web",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors.
  automaticVercelMonitors: true,
});