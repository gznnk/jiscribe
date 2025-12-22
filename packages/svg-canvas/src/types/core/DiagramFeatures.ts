/**
 * Unified diagram features configuration.
 * Controls which feature interfaces should be included in the resulting types.
 * Used across data, state, and props type creation.
 */
export type DiagramFeatures = {
	/** Frame properties (position, size, rotation, scale) */
	frameable?: boolean;
	/** Basic selection capability */
	selectable?: boolean;
	/** Position, size, and rotation transformation */
	transformative?: boolean;
	/** Container for other diagram items */
	itemable?: boolean;
	/** Connection points and lines */
	connectable?: boolean;
	/** Stroke/border styling */
	strokable?: boolean;
	/** Fill/background styling */
	fillable?: boolean;
	/** Corner radius styling */
	cornerRoundable?: boolean;
	/** Text content and styling */
	textable?: boolean;
	/** Executable/clickable functionality */
	executable?: boolean;
	/** File drop handling */
	fileDroppable?: boolean;
	/** Origin point (originX, originY) for child diagram placement */
	originable?: boolean;
};
