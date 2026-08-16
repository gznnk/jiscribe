// docOps aggregation; the public entry is src/doc.ts.
// Layout, naming and the argument-order rule are in ./README.md.
export { createDocOps, type DocOps } from "./createDocOps";
export { type AlignEdge, type DistributeAxis } from "./ops/arrange";
export {
	type UpdateConnectorEntry,
	type ConnectParams,
	type UpdateConnectorParams,
} from "./ops/connectors";
export { type AddObjectParams, type AddObjectEntry } from "./ops/create";
export {
	type AnchorHandleId,
	type EdgeAnchorHandle,
} from "./utils/connectorEndpoints";
export { type DeleteObjectsResult } from "./ops/delete";
export { type RemoveObjectsFromGroupResult } from "./ops/grouping";
export { type ZOrderPlacement } from "./ops/order";
export {
	type MoveObjectParams,
	type MoveObjectEntry,
	type ResizeObjectParams,
} from "./ops/place";
export { type SetPointsEntry, type SetRotationResult } from "./ops/reshape";
export { type SetStyleResult } from "./ops/style";
export {
	type SetTextEntry,
	type SetTextStyleEntry,
	type TextStyleParams,
} from "./ops/text";
export { type StyleParams } from "./utils/styleFields";
export { DocOperationError } from "./errors";
export type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
// Re-exported so a consumer can name an EdgeAnchorHandle's side without reaching into
// the schemas layer.
export type { EdgeAnchorSide } from "../schemas/objects/types/EndpointRef";
// Re-exported so a consumer can name what getObjectsBounds returns, and the vertices
// setPoints takes, without taking a dependency on @jiscribe/geometry.
export type { Point, Rect } from "@jiscribe/geometry";
