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
export { type ZOrderPlacement } from "./reorderObjects";
export { type SetRotationResult } from "./setRotation";
export { type SetStyleResult } from "./setStyle";
export { type StyleParams } from "./styleFields";
export { type StyleTextParams } from "./styleText";
export { type UpdateConnectorParams } from "./updateConnector";
export { DocOperationError } from "./errors";
export type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
// Re-exported so a consumer can name an EdgeAnchorHandle's side without reaching into
// the schemas layer.
export type { EdgeAnchorSide } from "../schemas/objects/types/EndpointRef";
// Re-exported so a consumer can name what getObjectsBounds returns, and the vertices
// setPoints takes, without taking a dependency on @jiscribe/geometry.
export type { Point, Rect } from "@jiscribe/geometry";
