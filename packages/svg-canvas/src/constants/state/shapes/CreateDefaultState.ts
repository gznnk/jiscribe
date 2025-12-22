import { ConnectableDefaultState } from "./ConnectableDefaultState";
import type { DiagramFeatures } from "../../../types/core/DiagramFeatures";
import type { DiagramType } from "../../../types/core/DiagramType";
import { DiagramBaseDefaultState } from "../core/DiagramBaseDefaultState";
import { FillableDefaultState } from "../core/FillableDefaultState";
import { ItemableDefaultState } from "../core/ItemableDefaultState";
import { SelectableDefaultState } from "../core/SelectableDefaultState";
import { StrokableDefaultState } from "../core/StrokableDefaultState";
import { TextableDefaultState } from "../core/TextableDefaultState";
import { TransformativeDefaultState } from "../core/TransformativeDefaultState";

/**
 * Creates default state for a shape by combining feature-specific defaults.
 * Uses conditional types to include only the required defaults based on features.
 *
 * @param config - Configuration for the shape
 * @returns Default state object for the shape
 */
export function CreateDefaultState<T>(config: {
	type: DiagramType;
	options: DiagramFeatures;
	baseData: Record<string, unknown>;
	properties?: Partial<T>;
}): T {
	const { type, options, baseData, properties } = config;

	// Build default state by combining base data and state with feature-specific defaults
	const result = {
		...DiagramBaseDefaultState,
		...(options.selectable ? SelectableDefaultState : {}),
		...(options.transformative ? TransformativeDefaultState : {}),
		...(options.itemable ? ItemableDefaultState : {}),
		...(options.connectable ? ConnectableDefaultState : {}),
		...(options.strokable ? StrokableDefaultState : {}),
		...(options.fillable ? FillableDefaultState : {}),
		...(options.textable ? TextableDefaultState : {}),
		...baseData,
		...(properties ? properties : {}),
		type,
	} as const;

	return result as T;
}
