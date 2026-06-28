import type { EllipseState } from "./EllipseState";
import type { EllipseDoc } from "../../../../schemas/objects/primitives/ellipse/EllipseDoc";
import { EllipseFeatures } from "../../../../schemas/objects/primitives/ellipse/EllipseDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** EllipseDoc ↔ EllipseState 変換（Frame 系共通ロジックを features から生成）。 */
export const { toState: ellipseToState, toDoc: ellipseToDoc } =
	createFrameMapper<EllipseDoc, EllipseState>(EllipseFeatures);
