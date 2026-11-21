/**
 * The drawing every UML stencil icon shares, in the 24x24 box createStencilIcon
 * authors in. Each icon is read as this box plus its own mark, so the box is
 * assembled from here and the icon module holds only what tells it apart.
 */

export const UmlIconFrame = () => (
	<rect
		x="3"
		y="3"
		width="18"
		height="18"
		rx="1"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
	/>
);

/** The line under the title band, drawn at the outline's weight so it reads as part of the frame. */
export const UmlIconTitleDivider = () => (
	<line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
);
