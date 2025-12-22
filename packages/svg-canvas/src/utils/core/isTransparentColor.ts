/**
 * Checks if a CSS color value is transparent.
 * Handles various transparent color representations:
 * - "transparent"
 * - rgba(r,g,b,0)
 * - hsla(h,s,l,0)
 * - #RRGGBBAA where AA is 00
 * - any other CSS color format with alpha = 0
 *
 * @param color - CSS color value to check
 * @returns true if the color is transparent, false otherwise
 */
export const isTransparentColor = (color: string | undefined): boolean => {
	if (!color) {
		return false;
	}

	const normalized = color.trim().toLowerCase();

	// Direct transparent keyword
	if (normalized === "transparent") {
		return true;
	}

	// Check rgba/hsla formats with alpha = 0
	// Match rgba(r,g,b,0) or rgba(r,g,b,0.0) or hsla(h,s,l,0)
	const rgbaHslaPattern = /^(rgba|hsla)\s*\([^)]*,\s*0(\.0*)?\s*\)$/;
	if (rgbaHslaPattern.test(normalized)) {
		return true;
	}

	// Check 8-digit hex format with alpha = 00
	// Match #RRGGBB00 or #RGB0 (shorthand)
	const hex8Pattern = /^#[0-9a-f]{6}00$/;
	const hex4Pattern = /^#[0-9a-f]{3}0$/;
	if (hex8Pattern.test(normalized) || hex4Pattern.test(normalized)) {
		return true;
	}

	// Use browser's color parsing if available
	if (typeof document !== "undefined") {
		try {
			const canvas = document.createElement("canvas");
			canvas.width = 1;
			canvas.height = 1;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.fillStyle = color;
				ctx.fillRect(0, 0, 1, 1);
				const imageData = ctx.getImageData(0, 0, 1, 1);
				// Check if alpha channel is 0
				return imageData.data[3] === 0;
			}
		} catch {
			// If color parsing fails, assume not transparent
			return false;
		}
	}

	return false;
};
