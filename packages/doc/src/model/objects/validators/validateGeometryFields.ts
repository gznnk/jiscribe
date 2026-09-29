import {
	validateOptionalNumber,
	validateRequiredNumber,
} from "./validateNumberFields";
import { validatePolyFields } from "./validatePolyFields";
import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";
import type { GeometryType } from "../types/GeometryType";
import { GEOMETRY_SIZE_MIN } from "../types/GeometryType";

/**
 * One geometry coordinate field's check, given the name it is written under and
 * whether this type may leave `height` out.
 */
type GeometryFieldValidator = (
	o: Record<string, unknown>,
	path: string,
	key: string,
	autoHeight: boolean,
) => SemanticDiagnostic[];

/** A coordinate that may be anywhere on the axis. */
const validateCoordinate: GeometryFieldValidator = (o, path, key) =>
	validateRequiredNumber(o, path, key);

/** An extent, which cannot be negative (`GEOMETRY_SIZE_MIN`). */
const validateExtent: GeometryFieldValidator = (o, path, key) =>
	validateRequiredNumber(o, path, key, GEOMETRY_SIZE_MIN);

/**
 * The coordinate fields each geometry holds, keyed by field name so that the one
 * declaration answers both what to validate and which names the geometry occupies
 * (see {@link collectGeometryKeys}). One entry per GeometryType, so a geometry
 * added to the union has to declare its fields here. `point` stores a position
 * only: its box comes from the content, so the doc has no width/height to check.
 * The insertion order is the order the diagnostics come out in.
 */
const geometryFieldValidators: Record<
	GeometryType,
	Readonly<Record<string, GeometryFieldValidator>>
> = {
	none: {},
	rect: {
		x: validateCoordinate,
		y: validateCoordinate,
		width: validateExtent,
		// A type whose box holds its text may leave the height out, the height then
		// following the text (see supportsAutoHeight); every other type owes one.
		height: (o, path, key, autoHeight) =>
			autoHeight
				? validateOptionalNumber(o, path, key, GEOMETRY_SIZE_MIN)
				: validateRequiredNumber(o, path, key, GEOMETRY_SIZE_MIN),
	},
	ellipse: {
		cx: validateCoordinate,
		cy: validateCoordinate,
		rx: validateExtent,
		ry: validateExtent,
	},
	poly: { points: (o, path) => validatePolyFields(o, path) },
	point: {
		x: validateCoordinate,
		y: validateCoordinate,
	},
};

/**
 * The field names a geometry occupies on the doc, which the accepted-name set is
 * built from — a name the geometry writes is not one the type has to declare.
 *
 * @param geometry - The type's `features.geometry`; `"none"` yields an empty array
 * @returns The names in the order they are validated in, a fresh array
 */
export const collectGeometryKeys = (
	geometry: GeometryType,
): readonly string[] => Object.keys(geometryFieldValidators[geometry]);

/**
 * Validates the coordinate fields `features.geometry` requires.
 *
 * @param o - The object doc being checked, read as a plain record
 * @param path - JSON path of `o` itself; each diagnostic appends its field name to it
 * @param geometry - The type's `features.geometry`, which picks the field set
 * @param autoHeight - Whether a `rect` geometry may leave `height` out (see `supportsAutoHeight`);
 *   ignored by every other geometry
 * @returns One diagnostic per field that is missing or out of range, in declaration order
 */
export const validateGeometryFields = (
	o: Record<string, unknown>,
	path: string,
	geometry: GeometryType,
	autoHeight: boolean,
): SemanticDiagnostic[] =>
	Object.entries(geometryFieldValidators[geometry]).flatMap(([key, validate]) =>
		validate(o, path, key, autoHeight),
	);
