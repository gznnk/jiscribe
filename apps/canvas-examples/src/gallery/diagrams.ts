import type { Camera } from "@jiscribe/canvas";

/** One gallery entry: a real `.jis.json` from `diagrams/`, shown as-is. */
export type GalleryDiagram = {
	/** Stable slug used as the URL hash. */
	id: string;
	title: string;
	description: string;
	/** File name under `diagrams/`, shown as the source path. */
	fileName: string;
	/**
	 * Framing applied once on mount (`initialConfig.viewport`). `minX` / `minY` sit a
	 * margin above and left of the drawing's own bounds; the zoom is picked so the whole
	 * drawing is in view on a laptop-sized window. The visible extent grows with the
	 * window from there, since the zoom is absolute.
	 */
	camera: Camera;
	/** Loads the document text. Dynamic so each diagram is fetched only when opened. */
	load: () => Promise<string>;
};

// A handful of finished drawings, deliberately not all of `diagrams/` — this section exists
// to show what the canvas can hold.
export const GALLERY_DIAGRAMS: ReadonlyArray<GalleryDiagram> = [
	{
		id: "daytrade-terminal",
		title: "Day Trading Terminal",
		description:
			"A dense trading terminal mockup, every panel drawn on the canvas. Pan and zoom in.",
		fileName: "daytrade-terminal.jis.json",
		// Drawing bounds: x 0..1520 / y 0..960
		camera: { minX: -24, minY: -24, zoom: 0.75 },
		load: () =>
			import("../../diagrams/daytrade-terminal.jis.json?raw").then(
				(module) => module.default,
			),
	},
	{
		id: "rainy-crossing",
		title: "Rainy Crossing",
		description:
			"A rain-soaked city crossing with umbrellas and reflections. Pan and zoom in.",
		fileName: "rainy-crossing.jis.json",
		// Drawing bounds: x 20..1500 / y -62..970
		camera: { minX: -4, minY: -86, zoom: 0.75 },
		load: () =>
			import("../../diagrams/rainy-crossing.jis.json?raw").then(
				(module) => module.default,
			),
	},
	{
		id: "knowledge-graph",
		title: "Knowledge Graph",
		description:
			"228 nodes and 439 edges of software development knowledge, laid out on one canvas. Pan and zoom in.",
		fileName: "knowledge-graph.jis.json",
		// Drawing bounds: x -4102..4094 / y -3534..3563. The drawing is much wider than a
		// window, so the zoom is picked to fit its height and minX centres it horizontally.
		camera: { minX: -5400, minY: -3600, zoom: 0.115 },
		load: () =>
			import("../../diagrams/knowledge-graph.jis.json?raw").then(
				(module) => module.default,
			),
	},
];
