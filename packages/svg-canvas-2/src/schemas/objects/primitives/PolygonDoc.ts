import type { Point } from "@workspace/geometry";

import type { Prettify } from "../../../../../utility-types/src";
import type { ObjectDoc } from "../base/ObjectDoc";

export type PolygonDoc = Prettify<
	ObjectDoc & {
		type: "polygon";
		points: Point[];
	}
>;
