/**
 * Configuration for which menu categories to display when a diagram is selected.
 * Each property indicates whether that menu category should be shown.
 */
export type DiagramMenuConfig = {
	/** Show background color picker */
	backgroundColor?: boolean;

	/** Show border color picker */
	borderColor?: boolean;

	/** Show line color picker */
	lineColor?: boolean;

	/** Show border style controls with nested options */
	borderStyle?: {
		/** Show border radius control within border style menu */
		radius?: boolean;
	};

	/** Show arrow head controls */
	arrowHead?: boolean;

	/** Show line style controls (width, dash type, etc.) */
	lineStyle?: boolean;

	/** Show font style controls (size, color, bold, etc.) */
	fontStyle?: boolean;

	/** Show text alignment controls (left, center, right, top, middle, bottom) */
	textAlignment?: boolean;

	/** Show aspect ratio lock control */
	aspectRatio?: boolean;
};
