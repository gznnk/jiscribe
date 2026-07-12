import type { TriangleState } from "./TriangleState";
import type { TriangleDoc } from "../../../../schemas/objects/primitives/triangle/TriangleDoc";
import { TriangleFeatures } from "../../../../schemas/objects/primitives/triangle/TriangleDoc";
import { createFrameMapper } from "../../base/FrameMapper";

/** TriangleDoc <-> TriangleState conversion (Frame-family shared logic generated from features). */
export const { toState: triangleToState, toDoc: triangleToDoc } =
	createFrameMapper<TriangleDoc, TriangleState>(TriangleFeatures);
