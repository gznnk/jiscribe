// Public API for orthogonal routing. Internal stage modules (stub / elbowCandidates /
// simplifyPath / routeCost) are imported directly from tests, but only this module is
// exposed externally.
export { routeOrthogonalConnector } from "./routeOrthogonalConnector";
export { routeSelfLoop } from "./selfLoop";
export { resolveOrthogonalRoute } from "./resolveOrthogonalRoute";
export type {
	OrthogonalConnectorEndpoint,
	RouteOrthogonalConnectorOptions,
} from "./types";
export { alignVertexPath } from "./alignVertexPath";
export { calcEndpointDirection } from "./endpointDirection";
