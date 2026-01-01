import type { Prettify } from "@workspace/utility-types";

import type { ConnectableData } from "./ConnectableData";
import type { DiagramFeatures } from "../../core/DiagramFeatures";
import type { CornerRoundableData } from "../core/CornerRoundableData";
import type { DiagramBaseData } from "../core/DiagramBaseData";
import type { EllipseData } from "../core/EllipseData";
import type { FillableData } from "../core/FillableData";
import type { ItemableData } from "../core/ItemableData";
import type { OriginableData } from "../core/OriginableData";
import type { PointData } from "../core/PointData";
import type { PolyData } from "../core/PolyData";
import type { RectData } from "../core/RectData";
import type { StrokableData } from "../core/StrokableData";
import type { TextableData } from "../core/TextableData";
import type { TransformativeData } from "../core/TransformativeData";

/**
 * Conditional geometry data type based on specified geometry feature.
 */
type GeometryData<T extends DiagramFeatures> = //
	T["geometry"] extends "rect"
		? RectData
		: T["geometry"] extends "ellipse"
			? EllipseData
			: T["geometry"] extends "point"
				? PointData
				: T["geometry"] extends "poly"
					? PolyData
					: object;

/**
 * Generic type creator for diagram data types.
 * Conditionally includes feature interfaces based on provided features.
 *
 * @template T - DiagramFeatures configuration
 * @template P - Additional properties type (optional)
 */
export type CreateDataType<T extends DiagramFeatures, P = object> = Prettify<
	DiagramBaseData & {
		geometryType: T["geometry"] extends string ? T["geometry"] : "none";
	} & GeometryData<T> &
		(T["transformative"] extends true ? TransformativeData : object) &
		(T["itemable"] extends true ? ItemableData : object) &
		(T["connectable"] extends true ? ConnectableData : object) &
		(T["strokable"] extends true ? StrokableData : object) &
		(T["fillable"] extends true ? FillableData : object) &
		(T["cornerRoundable"] extends true ? CornerRoundableData : object) &
		(T["textable"] extends true ? TextableData : object) &
		(T["originable"] extends true ? OriginableData : object) &
		P
>;
