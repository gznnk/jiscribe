import type { ObjectDocValidateFn } from "@jiscribe/canvas-sdk/doc";

import { AWS_GROUP_KINDS, isAwsGroupKind } from "./AwsGroupDoc";

/**
 * Checks awsGroup's own `kind` (optional). The border colour, the line style and
 * the corner badge all follow from it, so a misspelling quietly draws the
 * generic frame instead.
 *
 * There are only nineteen kinds, so the message carries the whole list rather
 * than a guess at candidates. The JSON schema enumerates the same list, so this
 * is a structural error the schema also catches and carries no `beyondSchema`.
 */
export const validateAwsGroupKind: ObjectDocValidateFn = (value, path) => {
	if (!("kind" in value) || value.kind === undefined) {
		return [];
	}
	if (isAwsGroupKind(value.kind)) {
		return [];
	}
	return [
		{
			path: `${path}.kind`,
			message: `must be one of: ${AWS_GROUP_KINDS.join(", ")}`,
		},
	];
};
