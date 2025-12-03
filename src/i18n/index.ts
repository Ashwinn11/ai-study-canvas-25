/**
 * Simple i18n placeholder
 */

export const t = (key: string, params?: Record<string, any>): string => {
    // Simple implementation that just returns the key or interpolates params
    if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
            result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
    }
    return key;
};

export default { t };
