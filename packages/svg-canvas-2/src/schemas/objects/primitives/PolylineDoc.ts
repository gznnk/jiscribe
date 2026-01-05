import type { Point } from "@workspace/geometry";

import type { Prettify } from "../../../../../utility-types/src";
import type { ArrowType } from "../../types/ArrowType";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";

export type PolylineDoc = Prettify<
	ObjectDoc &
		StrokeStyleDoc & {
			type: "polyline";
			points: Point[];
			startArrow?: ArrowType;
			endArrow?: ArrowType;
		}
>;
