/**
 * Refresh Manager Service
 * Coordinates global data refresh and connectivity checks
 */

import { logger } from "@/utils/logger";

interface RefreshOptions {
    force?: boolean;
    refreshAll?: boolean;
}

interface RefreshStats {
    lastRefresh: number;
    totalRefreshes: number;
    errors: number;
}

interface ScreenRegistration {
    refreshFn: () => Promise<void>;
    options: {
        minInterval: number;
        priority: "high" | "medium" | "low";
    };
}

class RefreshManager {
    private stats: RefreshStats = {
        lastRefresh: 0,
        totalRefreshes: 0,
        errors: 0,
    };

    private screens: Map<string, ScreenRegistration> = new Map();

    async refreshAll(options: RefreshOptions = {}): Promise<string[]> {
        const { force = false, refreshAll = false } = options;
        logger.info(`[RefreshManager] Refreshing all (force=${force}, all=${refreshAll})`);

        const refreshedScreens: string[] = [];

        for (const [screenName, registration] of this.screens.entries()) {
            try {
                await registration.refreshFn();
                refreshedScreens.push(screenName);
            } catch (error) {
                logger.error(`[RefreshManager] Error refreshing ${screenName}:`, error);
                this.stats.errors++;
            }
        }

        this.stats.lastRefresh = Date.now();
        this.stats.totalRefreshes++;

        return refreshedScreens;
    }

    registerScreen(
        screenName: string,
        refreshFn: () => Promise<void>,
        options: { minInterval: number; priority: "high" | "medium" | "low" }
    ) {
        this.screens.set(screenName, { refreshFn, options });
    }

    unregisterScreen(screenName: string) {
        this.screens.delete(screenName);
    }

    async refreshScreen(screenName: string, force: boolean = false): Promise<boolean> {
        const registration = this.screens.get(screenName);
        if (!registration) {
            return false;
        }

        try {
            await registration.refreshFn();
            return true;
        } catch (error) {
            logger.error(`[RefreshManager] Error refreshing ${screenName}:`, error);
            return false;
        }
    }

    async checkConnectivity(): Promise<boolean> {
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
            return navigator.onLine;
        }
        return true;
    }

    getRefreshStats(): RefreshStats {
        return { ...this.stats };
    }
}

export const refreshManager = new RefreshManager();
