import type { ShapePreset } from "../../types/ShapePreset";

export const EllipseShapePresets: ShapePreset[] = [
	{
		id: "ellipse",
		objectType: "ellipse",
		label: "Ellipse",
		categories: { basic: 20 },
	},
	{
		// Flowchart on-page connector: an ellipse type reused as a small labelled
		// circle. It renders identically to `ellipse`, so it stays the same type
		// (not a distinct one) and only differs as a palette preset.
		id: "onPageConnector",
		objectType: "ellipse",
		label: "On-page connector",
		categories: { flowchart: 200 },
		defaultOverrides: { rx: 32, ry: 32 },
	},
];
