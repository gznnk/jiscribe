import type { Ellipse } from "@workspace/geometry";

import type { Prettify, ReadonlyOmit } from "../../../../../utility-types/src";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";
import type { TransformDoc } from "../base/TransformDoc";

export type EllipseDoc = Prettify<
	ObjectDoc &
		Ellipse &
		TransformDoc &
		StrokeStyleDoc &
		FillStyleDoc & { type: "ellipse" }
>;

export const ELLIPSE_DOC_DEFAULTS: ReadonlyOmit<EllipseDoc, "id"> = {
	type: "ellipse",
	cx: 0,
	cy: 0,
	rx: 50,
	ry: 30,
} as const;
