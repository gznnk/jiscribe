import { memo } from "react";

import { theme } from "../../../../../../theme/themeTokens";

/** Centers of the three dots across the 24-wide icon, evenly spaced. */
const DOT_CENTERS_X = [7, 12, 17];
const DOT_RADIUS = 1.5;

/**
 * Stands in for an arrow preview where the selection carries several marks.
 * Three dots rather than one of the marks, which would read as the mark the
 * whole selection is on; the line is dropped with them, since a line ending in
 * dots reads as a dashed stroke instead (the dash menu sits beside this one).
 *
 * Both ends draw the same icon, so a selection that disagrees about both shows
 * it twice. The same viewBox as ArrowHeadIconPreview, so the two line up when
 * one end states its mark and the other does not.
 */
const MixedArrowHeadIconComponent: React.FC = () => (
	<svg
		width="24"
		height="24"
		viewBox="0 6 24 12"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		style={{ pointerEvents: "none" }}
	>
		{DOT_CENTERS_X.map((centerX) => (
			// var() is not resolved in presentation attributes, so apply it via style.
			<circle
				key={centerX}
				cx={centerX}
				cy={12}
				r={DOT_RADIUS}
				style={{ fill: theme.foregroundMuted }}
			/>
		))}
	</svg>
);

export const MixedArrowHeadIcon = memo(MixedArrowHeadIconComponent);
