// docOps aggregation; the public entry is src/doc.ts.
export { createDocOps, type DocOps } from "./createDocOps";
export { type AddObjectParams } from "./addObject";
export { type AlignEdge, type DistributeAxis } from "./arrangeObjects";
export { type ConnectParams } from "./connect";
export {
	type AnchorHandleId,
	type EdgeAnchorHandle,
} from "./connectorEndpoints";
export { type DeleteObjectsResult } from "./deleteObjects";
export { type RemoveFromGroupResult } from "./groupObjects";
export { type MoveObjectParams, type ResizeObjectParams } from "./placeObjects";
export { type SetStyleResult } from "./setStyle";
export { type StyleParams } from "./styleFields";
export { type UpdateConnectorParams } from "./updateConnector";
export { DocOperationError } from "./errors";
export type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
// Re-exported so a consumer can name an EdgeAnchorHandle's side without reaching into
// the schemas layer.
export type { EdgeAnchorSide } from "../schemas/objects/types/EndpointRef";
// Re-exported so a consumer can name what getObjectsBounds returns without taking a
// dependency on @workspace/geometry.
export type { Rect } from "@workspace/geometry";
