import type { EllipseDoc } from "@jiscribe/doc/model/objects/primitives/ellipse/EllipseDoc";
import { EllipseFeatures } from "@jiscribe/doc/model/objects/primitives/ellipse/EllipseDoc";

import type { EllipseState } from "./EllipseState";
import { createFrameMapper } from "../../base/FrameMapper";

/** EllipseDoc ↔ EllipseState conversion (Frame-family common logic generated from features). */
export const { toState: ellipseToState, toDoc: ellipseToDoc } =
	createFrameMapper<EllipseDoc, EllipseState>(EllipseFeatures);
