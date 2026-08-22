import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";

export function getStrokeDasharray(
	dashType?: StrokeDashType,
	strokeWidth: number = 1,
): string | undefined {
	if (!dashType || dashType === "solid") {
		return undefined;
	}

	switch (dashType) {
		case "dashed":
			return `${strokeWidth * 4} ${strokeWidth * 4}`;
		case "dotted":
			return `${strokeWidth} ${strokeWidth * 2}`;
		default:
			return undefined;
	}
}
