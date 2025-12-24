import { isString } from "./isString";

/**
 * Check if value is a valid URL.
 */
export const isUrl = (value: unknown): value is string => {
	if (!isString(value)) return false;

	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
};
