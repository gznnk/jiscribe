// docOps aggregation; the public entry is src/doc.ts.
// Layout, naming and the argument-order rule are in ./README.md.
export { createDocOps, type DocOps } from "./createDocOps";
export { type AlignEdge, type DistributeAxis } from "./ops/arrange";
export {
	type ConnectParams,
	type UpdateConnectorEntry,
	type UpdateConnectorParams,
} from "./ops/connectors";
export { type AddObjectEntry, type AddObjectParams } from "./ops/create";
export { type DeleteObjectsResult } from "./ops/delete";
export { type RemoveObjectsFromGroupResult } from "./ops/grouping";
export { type GetZOrderResult, type ZOrderPlacement } from "./ops/order";
export {
	type ResizeObjectParams,
	type SetPositionEntry,
	type SetPositionParams,
} from "./ops/place";
export { type ObjectFilter, type ObjectSummary } from "./ops/query";
export { type SetPointsEntry, type SetRotationResult } from "./ops/reshape";
export { setExtraProps } from "./ops/extraProps";
export { type SetStyleResult } from "./ops/style";
export {
	type InlineTextStyleParams,
	type SetInlineTextStyleEntry,
	type SetTextEntry,
} from "./ops/text";
export { type ObjectTypeSummary } from "./ops/types";
export {
	type AnchorHandleId,
	type EdgeAnchorHandle,
} from "./utils/connectorEndpoints";
export { type StyleParams } from "./utils/styleFields";
export { DocOperationError } from "./errors";
export type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
// Re-exported so a consumer can name what getObject hands back without reaching into the
// schemas layer.
export type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
// Re-exported so a consumer can name an EdgeAnchorHandle's side without reaching into
// the schemas layer.
export type { EdgeAnchorSide } from "../schemas/objects/types/EndpointRef";
// Re-exported so a consumer can name what getCombinedBounds returns, and the vertices
// setPoints takes, without taking a dependency on @jiscribe/geometry.
export type { Point, Rect } from "@jiscribe/geometry";
