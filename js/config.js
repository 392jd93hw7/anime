// Public configuration only. Never put private API keys in this file.
export const CONFIG = {
  // Set this to an API base URL you own or are authorized to use.
  // Expected optional routes: GET /anime, GET /anime/:id, GET /schedule
  metadataApiBase: "",
  // Optional public API endpoint from a provider that explicitly permits browser access.
  // Leave empty to use the bundled demo catalog.
  enableDemoCatalog: true,
  catalogPageSize: 18,
  requestTimeoutMs: 10000,
};