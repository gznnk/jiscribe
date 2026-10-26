import { isString } from "@jiscribe/basic-validators";

/**
 * Type guard for a string the CSS parser accepts as a `color` value. Delegating to
 * `CSS.supports` instead of a regex keeps validity in step with whatever the running
 * browser understands.
 *
 * Browser-only, which is why this lives here rather than in `@jiscribe/basic-validators`:
 * `CSS` is undefined under Node (jsdom included), where calling this throws a
 * `ReferenceError`. Call it only from paths that are guaranteed to run in the browser, and
 * reach for `isCssSafeValue` when the check has to hold in Node too — `validateStateUtils`
 * relies on that split.
 *
 * @param value - Value to narrow; non-strings return false without reaching `CSS`
 */
export const isCssColor = (value: unknown): value is string => {
	if (!isString(value)) {
		return false;
	}

	return CSS.supports("color", value);
};
