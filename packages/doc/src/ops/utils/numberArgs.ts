import { DocOperationError } from "../errors";

/**
 * Refuses a coordinate or measurement that is not a finite number, before it is written.
 *
 * `NaN` and the infinities are numbers to `typeof`, and they survive far enough to be
 * written into an object: a shape then has no position anything can be measured against,
 * and the document only fails when it is next parsed — a save away for a host that writes
 * files, and never for one that holds a document in memory.
 *
 * Angles have their own guard ({@link requireRotationDegrees}), which normalises as well
 * as rejects.
 *
 * @param value - The number as the caller passed it
 * @param name - What it is, named as the caller's argument, so the message says which of
 *   several numbers was refused
 * @returns The same number, now known to be finite
 * @throws {@link DocOperationError} for `NaN` and for either infinity
 */
export const requireFiniteNumber = (value: number, name: string): number => {
	if (!Number.isFinite(value)) {
		throw new DocOperationError(
			`${name} must be a finite number, got ${String(value)}`,
		);
	}
	return value;
};
