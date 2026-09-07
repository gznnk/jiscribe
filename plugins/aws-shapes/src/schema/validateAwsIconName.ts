import type { ObjectDocValidateFn } from "@jiscribe/canvas-sdk/doc";
import type { SemanticDiagnostic } from "@jiscribe/doc";

import { isKnownAwsIconName } from "./icon/resolveAwsIconName";
import { suggestAwsIconNames } from "./icon/suggestAwsIconNames";

/**
 * Checks awsIcon's own `icon` (optional): that it names an icon the asset
 * package actually has.
 *
 * Candidates come with it because writing one of 781 names from memory usually
 * lands *near* it, and near is indistinguishable from right until it is looked
 * up. With the candidates in the message it takes one round trip to fix.
 *
 * `icon` is a plain string to the JSON schema, hence `beyondSchema` — so that a
 * schema-driven consumer does not read it as already checked.
 */
export const validateAwsIconName: ObjectDocValidateFn = (value, path) => {
	if (!("icon" in value) || value.icon === undefined) {
		return [];
	}
	const iconPath = `${path}.icon`;
	if (typeof value.icon !== "string") {
		return [
			{ path: iconPath, message: "must be a string", beyondSchema: true },
		];
	}
	if (isKnownAwsIconName(value.icon)) {
		return [];
	}
	return [buildUnknownIconDiagnostic(value.icon, iconPath)];
};

const buildUnknownIconDiagnostic = (
	icon: string,
	path: string,
): SemanticDiagnostic => {
	const suggestions = suggestAwsIconNames(icon);
	const quoted = suggestions.map((name) => `"${name}"`).join(" or ");
	return {
		path,
		message:
			suggestions.length === 0
				? `unknown AWS icon "${icon}" (see the icon list in the AI reference)`
				: `unknown AWS icon "${icon}" — did you mean ${quoted}?`,
		beyondSchema: true,
	};
};
