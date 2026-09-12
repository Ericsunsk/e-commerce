/**
 * Platform Domain (Client Contract)
 *
 * Server-only context: it renders no components, so there is no `ui/`. It does
 * expose browser-side clients for its own admin endpoints, which is what this
 * barrel is for — see Constitution Principle IX, "Browser Clients For Own
 * Endpoints".
 */

export * from './infrastructure/platform-settings-client.client';
