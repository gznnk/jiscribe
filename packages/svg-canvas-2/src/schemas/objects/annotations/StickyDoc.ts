import type { Rect } from "@workspace/geometry";

import type { Prettify } from "../../../../../utility-types/src";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";
import type { TransformDoc } from "../base/TransformDoc";

export type StickyDoc = Prettify<
	ObjectDoc &
		Rect &
		TransformDoc &
		StrokeStyleDoc &
		FillStyleDoc & { type: "sticky" }
>;
