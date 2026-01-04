import type { Prettify } from "../../../../../utility-types/src";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { TransformDoc } from "../base/TransformDoc";

export type GroupDoc = Prettify<
	ObjectDoc &
		TransformDoc & {
			type: "group";
			children: ObjectDoc[];
		}
>;
