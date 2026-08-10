// Headless (UI-independent) entry point. It mirrors the canvas package's own ./doc: an
// entry point for consumers that want to take part in parse-time validation without going
// through definitions.ts (which pulls in React components) — the MCP server, the Node-side
// diagnostics of the VSCode extension, and the like. It imports only ./schema/** and
// @jiscribe/canvas/doc / @jiscribe/canvas-sdk/doc, and never pulls in
// presentation / state / stencil.
// description / summary / outlineDescription / defaults are the single source of
// the generated JSON schema and AI docs (pnpm generate:ai).
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@jiscribe/canvas/doc";
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";

import { CARD_DOC_DEFAULTS, CardFeatures } from "./schema/card/CardDoc";
import { CROSS_DOC_DEFAULTS, CrossFeatures } from "./schema/cross/CrossDoc";
import { DB_DOC_DEFAULTS, DbFeatures } from "./schema/db/DbDoc";
import { DELAY_DOC_DEFAULTS, DelayFeatures } from "./schema/delay/DelayDoc";
import {
	DIAMOND_DOC_DEFAULTS,
	DiamondFeatures,
} from "./schema/diamond/DiamondDoc";
import {
	DISPLAY_DOC_DEFAULTS,
	DisplayFeatures,
} from "./schema/display/DisplayDoc";
import {
	DOCUMENT_DOC_DEFAULTS,
	DocumentFeatures,
} from "./schema/document/DocumentDoc";
import {
	EXTRACT_DOC_DEFAULTS,
	ExtractFeatures,
} from "./schema/extract/ExtractDoc";
import {
	HEXAGON_DOC_DEFAULTS,
	HexagonFeatures,
} from "./schema/hexagon/HexagonDoc";
import {
	LOOP_LIMIT_DOC_DEFAULTS,
	LoopLimitFeatures,
} from "./schema/loopLimit/LoopLimitDoc";
import {
	MANUAL_INPUT_DOC_DEFAULTS,
	ManualInputFeatures,
} from "./schema/manualInput/ManualInputDoc";
import {
	MULTI_DOCUMENT_DOC_DEFAULTS,
	MultiDocumentFeatures,
} from "./schema/multiDocument/MultiDocumentDoc";
import {
	OFF_PAGE_CONNECTOR_DOC_DEFAULTS,
	OffPageConnectorFeatures,
} from "./schema/offPageConnector/OffPageConnectorDoc";
import {
	PARALLELOGRAM_DOC_DEFAULTS,
	ParallelogramFeatures,
} from "./schema/parallelogram/ParallelogramDoc";
import {
	STADIUM_DOC_DEFAULTS,
	StadiumFeatures,
} from "./schema/stadium/StadiumDoc";
import {
	STORED_DATA_DOC_DEFAULTS,
	StoredDataFeatures,
} from "./schema/storedData/StoredDataDoc";
import {
	SUBROUTINE_DOC_DEFAULTS,
	SubroutineFeatures,
} from "./schema/subroutine/SubroutineDoc";
import {
	TRAPEZOID_DOC_DEFAULTS,
	TrapezoidFeatures,
} from "./schema/trapezoid/TrapezoidDoc";

export const cardDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: CardFeatures,
	defaults: CARD_DOC_DEFAULTS,
	description:
		"Card: a rectangle with the top-left corner cut off, used for punched-card style data in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc.",
	summary: "punched-card style data",
	outlineDescription: "Rectangle with the top-left corner cut off",
});

export const crossDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: CrossFeatures,
	defaults: CROSS_DOC_DEFAULTS,
	description:
		"Cross (plus) marker, used to mark junctions and for emphasis. Uses the same rect-based geometry (x/y/width/height) as RectDoc. The arms fill the whole box and the text is drawn as a label below it, auto-sized to the text itself — so the box does not need to be widened for a long note, and leaving the text out keeps a bare marker.",
	summary: "junction / emphasis marker",
	outlineDescription: "Plus sign, label below",
});

export const dbDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: DbFeatures,
	defaults: DB_DOC_DEFAULTS,
	description:
		"Database cylinder shape, typically used for data stores in architecture or ER diagrams. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a cylinder. Text is laid out in the body region below the top cap ellipse (not the full bounding box).",
	summary: "data store",
});

export const delayDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: DelayFeatures,
	defaults: DELAY_DOC_DEFAULTS,
	description:
		"Delay shape: a rectangle whose right edge is a semicircular bulge, used for wait/delay steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc.",
	summary: "wait / delay",
	outlineDescription: "Rectangle whose right edge is a semicircle",
});

export const diamondDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: DiamondFeatures,
	defaults: DIAMOND_DOC_DEFAULTS,
	description:
		"Diamond (rhombus) shape, typically used for decision/branch nodes in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a diamond. Text is laid out within the full bounding box (not clipped to the diamond interior).",
	summary: "decision / branch node",
});

export const displayDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: DisplayFeatures,
	defaults: DISPLAY_DOC_DEFAULTS,
	description:
		"Display shape with a pointed left edge and a rounded right cap, used for output-to-display steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc.",
	summary: "output to a display",
	outlineDescription: "Pointed left edge, rounded right cap",
});

export const documentDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: DocumentFeatures,
	defaults: DOCUMENT_DOC_DEFAULTS,
	description:
		"Document shape (rect with a wavy bottom edge), typically used for reports/files in flowcharts or deliverables in business diagrams. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a document. Text is laid out above the bottom wave band.",
	summary: "report, file",
});

export const extractDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: ExtractFeatures,
	defaults: EXTRACT_DOC_DEFAULTS,
	description:
		'The flowchart "extract" symbol — an upward triangle (apex at the top), used for extract/merge/marker nodes. Uses the same rect-based geometry (x/y/width/height) as RectDoc. The triangle fills the whole box and the text is drawn as a label below it, auto-sized to the text itself — so the box does not need to be widened for a long name, and leaving the text out keeps a bare marker.',
	summary: "extract / merge marker",
	outlineDescription: "Upward triangle, apex at the top, label below",
});

export const hexagonDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: HexagonFeatures,
	defaults: HEXAGON_DOC_DEFAULTS,
	description:
		"Hexagon shape with pointed left/right caps, typically used for preparation steps in flowcharts or emphasis nodes. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a hexagon. Text is laid out with a small horizontal inset to stay inside the caps.",
	summary: "preparation",
});

export const loopLimitDocDefinition: ObjectDocDefinition = createFrameObjectDoc(
	{
		features: LoopLimitFeatures,
		defaults: LOOP_LIMIT_DOC_DEFAULTS,
		description:
			'Loop-limit shape (a rectangle with both top corners cut off), marking the start of a loop in flowcharts; set "flipY": true to mark the loop end. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs. Text sits below the top bevels.',
		summary: 'loop start (`"flipY": true` for the end)',
		outlineDescription: "Rectangle with both top corners cut off",
	},
);

export const manualInputDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: ManualInputFeatures,
		defaults: MANUAL_INPUT_DOC_DEFAULTS,
		description:
			"Manual-input shape whose top edge slopes up toward the right, used for keyed/manual entry steps. Uses the same rect-based geometry (x/y/width/height) as RectDoc; text sits below the sloping top edge.",
		summary: "manual / keyed input",
		outlineDescription: "Top edge slopes up toward the right",
	});

export const multiDocumentDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: MultiDocumentFeatures,
		defaults: MULTI_DOCUMENT_DOC_DEFAULTS,
		description:
			"Multi-document shape (three stacked document sheets), used for report batches / file sets in flowcharts. The front sheet sits at the bottom-left and the two back sheets step toward the top-right. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs. Text is confined to the front sheet, above its bottom wave band.",
		summary: "report batch / file set",
		outlineDescription: "Three stacked wavy-bottom sheets",
	});

export const offPageConnectorDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: OffPageConnectorFeatures,
		defaults: OFF_PAGE_CONNECTOR_DOC_DEFAULTS,
		description:
			"Off-page connector: a home-plate pentagon (rectangle tapering to a downward point) marking a jump to another page/section of a flowchart, usually paired with an on-page connector by a short label. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a pentagon. Text sits in the rectangular band above the point.",
		summary: "off-page connector (jump to another page)",
		outlineDescription: "Home-plate pentagon pointing down",
	});

export const parallelogramDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: ParallelogramFeatures,
		defaults: PARALLELOGRAM_DOC_DEFAULTS,
		description:
			"Parallelogram shape (top edge shifted right), typically used for input/output steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a parallelogram. Text is laid out with a small horizontal inset to stay inside the slanted sides.",
		summary: "input / output",
	});

export const stadiumDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: StadiumFeatures,
	defaults: STADIUM_DOC_DEFAULTS,
	description:
		"Stadium (pill) shape with fully rounded ends, typically used for start/end terminators in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a stadium. Text is laid out within the full bounding box.",
	summary: "start / end terminator",
});

export const storedDataDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: StoredDataFeatures,
		defaults: STORED_DATA_DOC_DEFAULTS,
		description:
			"Stored-data shape (a rectangle whose left/right edges are arcs both bowing left, like a drum segment) — the generic storage symbol for files / caches that are not specifically a database (use DbDoc for databases). Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs. Text is laid out between the two side arcs.",
		summary: "generic stored data (file / cache)",
		outlineDescription: "Rectangle with both side edges bowed left",
	});

export const subroutineDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: SubroutineFeatures,
		defaults: SUBROUTINE_DOC_DEFAULTS,
		description:
			"Predefined-process (subroutine) box: a rectangle with a vertical bar near each side, for calls to a defined sub-procedure. Uses the same rect-based geometry (x/y/width/height) as RectDoc; text is inset horizontally to stay between the bars.",
		summary: "predefined process / call",
		outlineDescription: "Rectangle with a vertical bar near each side",
	});

export const trapezoidDocDefinition: ObjectDocDefinition = createFrameObjectDoc(
	{
		features: TrapezoidFeatures,
		defaults: TRAPEZOID_DOC_DEFAULTS,
		description:
			"Trapezoid (wide top, narrow bottom), typically used for manual-operation steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a trapezoid.",
		summary: "manual operation",
		outlineDescription: "Wide top, narrow bottom",
	},
);

/**
 * Headless `CanvasDocPlugin` for the flowchart shapes: the doc-layer view of
 * `flowchartPlugin`, teaching `createCanvasParser` the 18 types without loading
 * any React / presentation code (packages/canvas/docs/12-plugin-architecture.md).
 */
export const flowchartDocPlugin: CanvasDocPlugin = {
	id: "flowchart-shapes",
	objects: {
		card: cardDocDefinition,
		cross: crossDocDefinition,
		db: dbDocDefinition,
		delay: delayDocDefinition,
		diamond: diamondDocDefinition,
		display: displayDocDefinition,
		document: documentDocDefinition,
		extract: extractDocDefinition,
		hexagon: hexagonDocDefinition,
		loopLimit: loopLimitDocDefinition,
		manualInput: manualInputDocDefinition,
		multiDocument: multiDocumentDocDefinition,
		offPageConnector: offPageConnectorDocDefinition,
		parallelogram: parallelogramDocDefinition,
		stadium: stadiumDocDefinition,
		storedData: storedDataDocDefinition,
		subroutine: subroutineDocDefinition,
		trapezoid: trapezoidDocDefinition,
	},
};
