/**
 * The drawing every UML stencil icon shares, in the 24x24 box createStencilIcon
 * authors in. Each icon is read as this box plus its own mark, so the box is
 * assembled from here and the icon module holds only what tells it apart.
 */

/** @param strokeDasharray - SVG dash pattern in user units; omitted draws the outline solid */
export const UmlIconFrame = ({
	strokeDasharray,
}: {
	strokeDasharray?: string;
}) => (
	<rect
		x="3"
		y="4"
		width="18"
		height="16"
		rx="1"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeDasharray={strokeDasharray}
	/>
);

/** The line under the title band, drawn at the outline's weight so it reads as part of the frame. */
export const UmlIconTitleDivider = () => (
	<line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
);

/** Two rows in the body, the second short, standing for the box's content. */
export const UmlIconBodyRows = () => (
	<>
		<line
			x1="6"
			y1="13"
			x2="18"
			y2="13"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="6"
			y1="16.5"
			x2="14"
			y2="16.5"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</>
);
