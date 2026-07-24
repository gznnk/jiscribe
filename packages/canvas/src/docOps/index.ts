// docOps の集約（公開入口は src/doc-ops.ts）。
export { addRect, type AddRectParams } from "./addRect";
export { addEllipse, type AddEllipseParams } from "./addEllipse";
export { connect, type ConnectParams, type AnchorHandleId } from "./connect";
export { DocOperationError } from "./errors";
export type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
