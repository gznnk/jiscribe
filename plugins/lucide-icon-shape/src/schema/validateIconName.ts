import type { SemanticDiagnostic } from "@jiscribe/canvas/doc";
import type { ObjectDocValidateFn } from "@jiscribe/canvas-sdk/doc";

import { isKnownIconName } from "./icon/resolveIconName";
import { suggestIconNames } from "./icon/suggestIconNames";

/**
 * Validates the icon-specific `icon` (optional): it must name an icon the bundled
 * set actually has.
 *
 * The diagnostic names candidates when there are any, because this is the field an
 * author is most likely to get almost right — an icon set of this size is written
 * from memory, and a superseded or misspelled name is indistinguishable from a valid
 * one until it is looked up. With the candidates in the message, one round of
 * correcting is enough.
 *
 * Flagged `beyondSchema` because the JSON schema types `icon` as a plain string
 * rather than an enum of ~1800 names, so schema-driven consumers must not treat
 * this as a rule they already checked.
 */
export const validateIconName: ObjectDocValidateFn = (o, path) => {
	if (!("icon" in o) || o.icon === undefined) {
		return [];
	}
	const iconPath = `${path}.icon`;
	if (typeof o.icon !== "string") {
		return [
			{ path: iconPath, message: "must be a string", beyondSchema: true },
		];
	}
	if (isKnownIconName(o.icon)) {
		return [];
	}
	return [buildUnknownIconDiagnostic(o.icon, iconPath)];
};

const buildUnknownIconDiagnostic = (
	icon: string,
	path: string,
): SemanticDiagnostic => {
	const suggestions = suggestIconNames(icon);
	const quoted = suggestions.map((name) => `"${name}"`).join(" or ");
	return {
		path,
		message:
			suggestions.length === 0
				? `unknown icon "${icon}" (see the icon list in the AI reference)`
				: `unknown icon "${icon}" — did you mean ${quoted}?`,
		beyondSchema: true,
	};
};
