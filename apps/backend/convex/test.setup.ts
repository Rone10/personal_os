/**
 * Test setup for convex-test.
 * Exports the modules glob pattern for use in Convex integration tests.
 */

// @ts-expect-error - import.meta.glob is a Vite-specific feature available at runtime
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
