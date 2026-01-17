/**
 * Test setup for convex-test.
 * Exports the modules glob pattern for use in Convex integration tests.
 */
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
