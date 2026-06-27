// 直交ルーティングの公開 API。内部のステージモジュール（stub / elbowCandidates /
// simplifyPath / routeCost）はテストから直接 import するが、外部にはここだけを見せる。
export { routeOrthogonalConnector } from "./routeOrthogonalConnector";
export { routeSelfLoop } from "./selfLoop";
export { resolveOrthogonalRoute } from "./resolveOrthogonalRoute";
export type {
	OrthogonalConnectorEndpoint,
	RouteOrthogonalConnectorOptions,
} from "./types";
