import { isString } from "./isString";

/**
 * Type guard for a string the CSS parser accepts as a `color` value. Delegating to
 * `CSS.supports` instead of a regex keeps validity in step with whatever the running
 * browser understands.
 *
 * Browser-only: `CSS` is undefined under Node, where calling this throws a `ReferenceError`.
 * Guard the call site by environment, or use {@link isCssSafeValue} for a portable check.
 *
 * @param value - Value to narrow; non-strings return false without reaching `CSS`
 */
export const isCssColor = (value: unknown): value is string => {
	if (!isString(value)) {
		return false;
	}

	return CSS.supports("color", value);
};
