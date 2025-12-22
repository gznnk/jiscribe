import type { Prettify } from "@workspace/utility-types";

import type { ConnectableProps } from "./ConnectableProps";
import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { DiagramBaseProps } from "../core/DiagramBaseProps";
import type { ExecutableProps } from "../core/ExecutableProps";
import type { FileDroppableProps } from "../core/FileDroppableProps";
import type { ItemableProps } from "../core/ItemableProps";
import type { SelectableProps } from "../core/SelectableProps";
import type { TextableProps } from "../core/TextableProps";
import type { TransformativeProps } from "../core/TransformativeProps";

// Import shared modules.

/**
 * Create diagram props type with unified features.
 * This type conditionally merges different props interfaces based on specified features,
 * allowing components to selectively inherit specific behaviors and event handlers.
 */
/**
 * Create diagram props type with unified features.
 * This type conditionally merges different props interfaces based on specified features,
 * allowing components to selectively inherit specific behaviors and event handlers.
 *
 * @template T - State type
 * @template U - DiagramFeatures configuration
 * @template P - Additional properties type (optional)
 */
export type CreateDiagramProps<
	T,
	U extends DiagramFeatures,
	P = object,
> = Prettify<
	Omit<T, "type" | "itemableType"> &
		DiagramBaseProps &
		(U["selectable"] extends true ? SelectableProps : object) &
		(U["transformative"] extends true ? TransformativeProps : object) &
		(U["itemable"] extends true ? ItemableProps : object) &
		(U["connectable"] extends true ? ConnectableProps : object) &
		(U["textable"] extends true ? TextableProps : object) &
		(U["executable"] extends true ? ExecutableProps : object) &
		(U["fileDroppable"] extends true ? FileDroppableProps : object) &
		P
>;
