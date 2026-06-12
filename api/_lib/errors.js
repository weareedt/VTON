// Shared error types so the route can map them consistently (one class identity).

/** An engine is missing required configuration (e.g. an API key). → HTTP 503. */
export class EngineConfigError extends Error {}
