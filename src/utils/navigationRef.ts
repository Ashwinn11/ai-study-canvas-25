import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Global navigation reference for programmatic navigation
 * Used by notification handlers and other services that need to navigate
 * without direct access to navigation prop
 */
export const navigationRef = createNavigationContainerRef();
