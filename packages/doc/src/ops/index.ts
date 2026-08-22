// docOps aggregation; the public entry is src/doc.ts.
// Layout, naming and the argument-order rule are in ./README.md.
export { createDocOps, type DocOps } from "./createDocOps";
export { type AlignEdge, type DistributeAxis } from "./arrange";
export {
	type ConnectParams,
	type UpdateConnectorEntry,
	type UpdateConnectorParams,
} from "./connectors";
export { type AddObjectEntry, type AddObjectParams } from "./create";
export { type DeleteObjectsResult } from "./delete";
export { type RemoveObjectsFromGroupResult } from "./grouping";
export { type GetZOrderResult, type ZOrderPlacement } from "./order";
export {
	type ResizeObjectParams,
	type SetHeightModeParams,
	type SetPositionEntry,
	type SetPositionParams,
} from "./place";
export { type ObjectFilter, type ObjectSummary } from "./query";
export { type SetPointsEntry, type SetRotationResult } from "./reshape";
export { setExtraProps } from "./extraProps";
export { type SetStyleResult } from "./style";
export {
	type InlineTextStyleParams,
	type SetInlineTextStyleEntry,
	type SetTextEntry,
} from "./text";
export { type ObjectTypeSummary } from "./types";
export {
	type AnchorHandleId,
	type EdgeAnchorHandle,
} from "./utils/connectorEndpoints";
export { type StyleParams } from "./utils/styleFields";
export { DocOperationError } from "./errors";
export type { CanvasDoc } from "../model/canvas/CanvasDoc";
// Re-exported so a consumer can name what getObject hands back without reaching into the
// schemas layer.
export type { ObjectDoc } from "../model/objects/base/ObjectDoc";
// Re-exported so a consumer can name an EdgeAnchorHandle's side without reaching into
// the schemas layer.
export type { EdgeAnchorSide } from "../model/objects/types/EndpointRef";
// Re-exported so a consumer can name what getCombinedBounds returns, and the vertices
// setPoints takes, without taking a dependency on @jiscribe/geometry.
export type { Point, Rect } from "@jiscribe/geometry";
