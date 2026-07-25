// docOps の集約（公開入口は src/doc.ts）。
export { createDocOps, type DocOps } from "./createDocOps";
export { type AddObjectParams } from "./addObject";
export { type ConnectParams, type AnchorHandleId } from "./connect";
export { DocOperationError } from "./errors";
export type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
