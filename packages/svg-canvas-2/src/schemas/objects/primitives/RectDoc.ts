import type { Rect } from "@workspace/geometry";

import type { Prettify } from "../../../../../utility-types/src";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { TransformDoc } from "../base/TransformDoc";

export type RectDoc = Prettify<
	ObjectDoc & Rect & TransformDoc & { type: "rect" }
>;
