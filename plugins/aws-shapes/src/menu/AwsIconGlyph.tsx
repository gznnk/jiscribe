import { memo } from "react";

import { AwsIconArt } from "../presentation/AwsIconArt";
import { readAwsIcon } from "../schema/icon/resolveAwsIconName";

type AwsIconGlyphProps = {
	/** Which icon to draw; a name that resolves to nothing draws nothing */
	name: string;
	/** Side of the square, in px */
	size: number;
};

/**
 * Draws one icon on its own, for the picker's grid and its toggle button: an
 * `<svg>` sized in px rather than in the canvas's coordinate system.
 *
 * The drawing follows the theme the same way it does on the canvas, so the icons
 * AWS ships a dark rendition of stay legible on a dark menu.
 */
const AwsIconGlyphComponent: React.FC<AwsIconGlyphProps> = ({ name, size }) => {
	const entry = readAwsIcon(name);
	if (entry === null) {
		return null;
	}
	return (
		<svg width={size} height={size} viewBox={entry.viewBox} aria-hidden="true">
			<AwsIconArt entry={entry} />
		</svg>
	);
};

export const AwsIconGlyph = memo(AwsIconGlyphComponent);
