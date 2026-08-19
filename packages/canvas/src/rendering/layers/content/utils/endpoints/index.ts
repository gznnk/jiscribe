// Public API for resolving connector endpoints (anchor -> world coordinates, outline adjustment).
// resolveEndpoint / adjustToOutline are internal helpers and are not exported.
// React hooks are separated into rendering/layers/content/hooks/.
export { resolveConnectorPoints } from "./resolveConnectorPoints";
export { resolveEndpointOwner } from "./resolveEndpointOwner";
