import type { Prettify } from "@workspace/utility-types";

import type { ConnectableState } from "./ConnectableState";
import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { DiagramBaseData } from "../../data/core/DiagramBaseData";
import type { CornerRoundableState } from "../core/CornerRoundableState";
import type { DiagramBaseState } from "../core/DiagramBaseState";
import type { FillableState } from "../core/FillableState";
import type { ItemableState } from "../core/ItemableState";
import type { SelectableState } from "../core/SelectableState";
import type { StrokableState } from "../core/StrokableState";
import type { TextableState } from "../core/TextableState";
import type { TransformativeState } from "../core/TransformativeState";

/**
 * Create state type with unified features.
 * This type conditionally merges different state interfaces based on specified features,
 * allowing components to selectively inherit specific behaviors and state properties.
 *
 * @template T - DiagramBaseData type
 * @template U - DiagramFeatures configuration
 * @template P - Additional properties type (optional)
 */
export type CreateStateType<
	T extends DiagramBaseData,
	U extends DiagramFeatures,
	P = object,
> = Prettify<
	T &
		DiagramBaseState &
		(U["selectable"] extends true ? SelectableState : object) &
		(U["transformative"] extends true ? TransformativeState : object) &
		(U["itemable"] extends true ? ItemableState : object) &
		(U["connectable"] extends true ? ConnectableState : object) &
		(U["strokable"] extends true ? StrokableState : object) &
		(U["fillable"] extends true ? FillableState : object) &
		(U["cornerRoundable"] extends true ? CornerRoundableState : object) &
		(U["textable"] extends true ? TextableState : object) &
		P
>;
