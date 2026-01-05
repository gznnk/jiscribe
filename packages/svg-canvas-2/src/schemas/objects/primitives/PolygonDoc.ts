import type { Point } from "@workspace/geometry";

import type { Prettify } from "../../../../../utility-types/src";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";

export type PolygonDoc = Prettify<
	ObjectDoc &
		StrokeStyleDoc &
		FillStyleDoc & {
			type: "polygon";
			points: Point[];
		}
>;
