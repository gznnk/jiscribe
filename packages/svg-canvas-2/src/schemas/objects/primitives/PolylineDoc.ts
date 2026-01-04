import type { Point } from "@workspace/geometry";

import type { Prettify } from "../../../../../utility-types/src";
import type { ArrowType } from "../../types/ArrowType";
import type { ObjectDoc } from "../base/ObjectDoc";

export type PolylineDoc = Prettify<
	ObjectDoc & {
		type: "polyline";
		points: Point[];
		startArrow?: ArrowType;
		endArrow?: ArrowType;
	}
>;
