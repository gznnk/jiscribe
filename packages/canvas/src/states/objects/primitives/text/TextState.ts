import type { TextFeatures } from "@jiscribe/doc/model/objects/primitives/text/TextDoc";

import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TextStateBrand: unique symbol;

/**
 * Runtime state of a bare text object. A Frame like every other transformed
 * shape — the difference is only that its width/height are derived from the
 * text rather than stored (see resizeTextStateToContent).
 */
export type TextState = CreateObjectState<
	typeof TextFeatures,
	typeof TextStateBrand
>;

/**
 * Type guard singling out the objects whose box is derived from their text, so
 * the derivation passes can skip everything else in the map.
 *
 * @param value - Value to check; only the discriminator is read, since the map it is picked from holds states the mappers or the paste boundary already validated
 * @returns True when the value is an object declaring `type: "text"`
 */
export const isTextState = (value: unknown): value is TextState =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "text";
