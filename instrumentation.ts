import * as Sentry from "@sentry/nextjs";

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        // Server-side initialization
        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

            // Adjust this value in production, or use tracesSampler for greater control
            tracesSampleRate: 1,

            // Setting this option to true will print useful information to the console while you're setting up Sentry.
            debug: false,
        });
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        // Edge runtime initialization
        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

            // Adjust this value in production, or use tracesSampler for greater control
            tracesSampleRate: 1,

            // Setting this option to true will print useful information to the console while you're setting up Sentry.
            debug: false,
        });
    }
}

// Instrument errors from nested React Server Components
export const onRequestError = Sentry.captureRequestError;
