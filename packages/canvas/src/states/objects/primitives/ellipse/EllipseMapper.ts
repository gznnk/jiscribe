import type { EllipseState } from "./EllipseState";
import type { EllipseDoc } from "../../../../schemas/objects/primitives/ellipse/EllipseDoc";
import { EllipseFeatures } from "../../../../schemas/objects/primitives/ellipse/EllipseDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** EllipseDoc ↔ EllipseState conversion (Frame-family common logic generated from features). */
export const { toState: ellipseToState, toDoc: ellipseToDoc } =
	createFrameMapper<EllipseDoc, EllipseState>(EllipseFeatures);
