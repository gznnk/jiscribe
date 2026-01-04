import type { Ellipse } from "@workspace/geometry";

import type { Prettify, ReadonlyOmit } from "../../../../../utility-types/src";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { TransformDoc } from "../base/TransformDoc";

export type EllipseDoc = Prettify<
	ObjectDoc & Ellipse & TransformDoc & { type: "ellipse" }
>;

export const ELLIPSE_DOC_DEFAULTS: ReadonlyOmit<EllipseDoc, "id"> = {
	type: "ellipse",
	cx: 0,
	cy: 0,
	rx: 50,
	ry: 30,
} as const;
