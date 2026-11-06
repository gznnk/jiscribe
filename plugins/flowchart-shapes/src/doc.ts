// Headless (UI-independent) entry point. It mirrors the canvas package's own ./doc: an
// entry point for consumers that want to take part in parse-time validation without going
// through definitions.ts (which pulls in React components) — the MCP server, the Node-side
// diagnostics of the VSCode extension, and the like. It imports only ./schema/** and
// @jiscribe/doc / @jiscribe/canvas-sdk/doc, and never pulls in
// presentation / state / stencil.
// description / summary / defaults are the single source of
// the generated JSON schema and AI docs (pnpm generate:schema).
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";

import { CARD_DOC_DEFAULTS, CardFeatures } from "./schema/card/CardDoc";
import { cardOutline } from "./schema/card/cardOutline";
import { CROSS_DOC_DEFAULTS, CrossFeatures } from "./schema/cross/CrossDoc";
import { crossOutline } from "./schema/cross/crossOutline";
import { DB_DOC_DEFAULTS, DbFeatures } from "./schema/db/DbDoc";
import { dbOutline } from "./schema/db/dbOutline";
import { DELAY_DOC_DEFAULTS, DelayFeatures } from "./schema/delay/DelayDoc";
import { delayOutline } from "./schema/delay/delayOutline";
import {
	DIAMOND_DOC_DEFAULTS,
	DiamondFeatures,
} from "./schema/diamond/DiamondDoc";
import { diamondOutline } from "./schema/diamond/diamondOutline";
import {
	DISPLAY_DOC_DEFAULTS,
	DisplayFeatures,
} from "./schema/display/DisplayDoc";
import { displayOutline } from "./schema/display/displayOutline";
import {
	DOCUMENT_DOC_DEFAULTS,
	DocumentFeatures,
} from "./schema/document/DocumentDoc";
import { documentOutline } from "./schema/document/documentOutline";
import {
	EXTRACT_DOC_DEFAULTS,
	ExtractFeatures,
} from "./schema/extract/ExtractDoc";
import { extractOutline } from "./schema/extract/extractOutline";
import {
	HEXAGON_DOC_DEFAULTS,
	HexagonFeatures,
} from "./schema/hexagon/HexagonDoc";
import { hexagonOutline } from "./schema/hexagon/hexagonOutline";
import { calcLoopLimitAnchorRegion } from "./schema/loopLimit/calcLoopLimitAnchorRegion";
import {
	LOOP_LIMIT_DOC_DEFAULTS,
	LoopLimitFeatures,
} from "./schema/loopLimit/LoopLimitDoc";
import { loopLimitOutline } from "./schema/loopLimit/loopLimitOutline";
import {
	MANUAL_INPUT_DOC_DEFAULTS,
	ManualInputFeatures,
} from "./schema/manualInput/ManualInputDoc";
import { manualInputOutline } from "./schema/manualInput/manualInputOutline";
import {
	MULTI_DOCUMENT_DOC_DEFAULTS,
	MultiDocumentFeatures,
} from "./schema/multiDocument/MultiDocumentDoc";
import { multiDocumentOutline } from "./schema/multiDocument/multiDocumentOutline";
import { calcOffPageConnectorAnchorRegion } from "./schema/offPageConnector/calcOffPageConnectorAnchorRegion";
import {
	OFF_PAGE_CONNECTOR_DOC_DEFAULTS,
	OffPageConnectorFeatures,
} from "./schema/offPageConnector/OffPageConnectorDoc";
import { offPageConnectorOutline } from "./schema/offPageConnector/offPageConnectorOutline";
import {
	PARALLELOGRAM_DOC_DEFAULTS,
	ParallelogramFeatures,
} from "./schema/parallelogram/ParallelogramDoc";
import { parallelogramOutline } from "./schema/parallelogram/parallelogramOutline";
import {
	STADIUM_DOC_DEFAULTS,
	StadiumFeatures,
} from "./schema/stadium/StadiumDoc";
import { stadiumOutline } from "./schema/stadium/stadiumOutline";
import {
	STORED_DATA_DOC_DEFAULTS,
	StoredDataFeatures,
} from "./schema/storedData/StoredDataDoc";
import { storedDataOutline } from "./schema/storedData/storedDataOutline";
import {
	SUBROUTINE_DOC_DEFAULTS,
	SubroutineFeatures,
} from "./schema/subroutine/SubroutineDoc";
import {
	calcCardTextRegion,
	calcDbTextRegion,
	calcDelayTextRegion,
	calcDiamondTextRegion,
	calcDisplayTextRegion,
	calcDocumentTextRegion,
	calcHexagonTextRegion,
	calcLoopLimitTextRegion,
	calcManualInputTextRegion,
	calcMultiDocumentTextRegion,
	calcOffPageConnectorTextRegion,
	calcParallelogramTextRegion,
	calcStadiumTextRegion,
	calcStoredDataTextRegion,
	calcSubroutineTextRegion,
	calcTrapezoidTextRegion,
} from "./schema/textRegions";
import {
	TRAPEZOID_DOC_DEFAULTS,
	TrapezoidFeatures,
} from "./schema/trapezoid/TrapezoidDoc";
import { trapezoidOutline } from "./schema/trapezoid/trapezoidOutline";

export const cardDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: CardFeatures,
	textRegion: calcCardTextRegion,
	outline: cardOutline,
	defaults: CARD_DOC_DEFAULTS,
	description:
		"Card: a rectangle with the top-left corner cut off, used for punched-card style data in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc.",
	summary: "punched-card style data",
});

export const crossDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: CrossFeatures,
	outline: crossOutline,
	defaults: CROSS_DOC_DEFAULTS,
	description:
		"Cross (plus) marker, used to mark junctions and for emphasis. Uses the same rect-based geometry (x/y/width/height) as RectDoc. The arms fill the whole box and the text is drawn as a label below it, auto-sized to the text itself — so the box does not need to be widened for a long note, and leaving the text out keeps a bare marker.",
	summary: "junction / emphasis marker",
});

export const dbDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: DbFeatures,
	textRegion: calcDbTextRegion,
	outline: dbOutline,
	defaults: DB_DOC_DEFAULTS,
	description:
		"Database cylinder shape, typically used for data stores in architecture or ER diagrams. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a cylinder. Text is laid out in the body region below the top cap ellipse (not the full bounding box).",
	summary: "data store",
});

export const delayDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: DelayFeatures,
	textRegion: calcDelayTextRegion,
	outline: delayOutline,
	defaults: DELAY_DOC_DEFAULTS,
	description:
		"Delay shape: a rectangle whose right edge is a semicircular bulge, used for wait/delay steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc.",
	summary: "wait / delay",
});

export const diamondDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: DiamondFeatures,
	textRegion: calcDiamondTextRegion,
	outline: diamondOutline,
	defaults: DIAMOND_DOC_DEFAULTS,
	description:
		"Diamond (rhombus) shape, typically used for decision/branch nodes in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a diamond, with its four vertices at the midpoints of the box's edges — so a connector on topCenter / rightCenter / bottomCenter / leftCenter lands exactly on a point. Text is laid out in the rhombus's inscribed rectangle, the middle half of the box on each axis.",
	summary: "decision / branch node",
});

export const displayDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: DisplayFeatures,
	textRegion: calcDisplayTextRegion,
	outline: displayOutline,
	defaults: DISPLAY_DOC_DEFAULTS,
	description:
		"Display shape with a pointed left edge and a rounded right cap, used for output-to-display steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc.",
	summary: "output to a display",
});

export const documentDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: DocumentFeatures,
	textRegion: calcDocumentTextRegion,
	outline: documentOutline,
	defaults: DOCUMENT_DOC_DEFAULTS,
	description:
		"Document shape (rect with a wavy bottom edge), typically used for reports/files in flowcharts or deliverables in business diagrams. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a document. Text is laid out above the bottom wave band.",
	summary: "report, file",
});

export const extractDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: ExtractFeatures,
	outline: extractOutline,
	defaults: EXTRACT_DOC_DEFAULTS,
	description:
		'The flowchart "extract" symbol — an upward triangle (apex at the top), used for extract/merge/marker nodes. Uses the same rect-based geometry (x/y/width/height) as RectDoc. The triangle fills the whole box and the text is drawn as a label below it, auto-sized to the text itself — so the box does not need to be widened for a long name, and leaving the text out keeps a bare marker.',
	summary: "extract / merge marker",
});

export const hexagonDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: HexagonFeatures,
	textRegion: calcHexagonTextRegion,
	outline: hexagonOutline,
	defaults: HEXAGON_DOC_DEFAULTS,
	description:
		"Hexagon shape with pointed left/right caps, typically used for preparation steps in flowcharts or emphasis nodes. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a hexagon. Text is laid out with a small horizontal inset to stay inside the caps.",
	summary: "preparation",
});

export const loopLimitDocDefinition: ObjectDocDefinition = createFrameObjectDoc(
	{
		features: LoopLimitFeatures,
		textRegion: calcLoopLimitTextRegion,
		outline: loopLimitOutline,
		anchorRegion: calcLoopLimitAnchorRegion,
		defaults: LOOP_LIMIT_DOC_DEFAULTS,
		description:
			'Loop-limit shape (a rectangle with both top corners cut off), marking the start of a loop in flowcharts; set "flipY": true to mark the loop end. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs. Text sits below the top bevels.',
		summary: 'loop start (`"flipY": true` for the end)',
	},
);

export const manualInputDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: ManualInputFeatures,
		textRegion: calcManualInputTextRegion,
		outline: manualInputOutline,
		defaults: MANUAL_INPUT_DOC_DEFAULTS,
		description:
			"Manual-input shape whose top edge slopes up toward the right, used for keyed/manual entry steps. Uses the same rect-based geometry (x/y/width/height) as RectDoc; text sits below the sloping top edge.",
		summary: "manual / keyed input",
	});

export const multiDocumentDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: MultiDocumentFeatures,
		textRegion: calcMultiDocumentTextRegion,
		outline: multiDocumentOutline,
		defaults: MULTI_DOCUMENT_DOC_DEFAULTS,
		description:
			"Multi-document shape (three stacked document sheets), used for report batches / file sets in flowcharts. The front sheet sits at the bottom-left and the two back sheets step toward the top-right. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs. Text is confined to the front sheet, above its bottom wave band.",
		summary: "report batch / file set",
	});

export const offPageConnectorDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: OffPageConnectorFeatures,
		textRegion: calcOffPageConnectorTextRegion,
		outline: offPageConnectorOutline,
		anchorRegion: calcOffPageConnectorAnchorRegion,
		defaults: OFF_PAGE_CONNECTOR_DOC_DEFAULTS,
		description:
			"Off-page connector: a home-plate pentagon (rectangle tapering to a downward point) marking a jump to another page/section of a flowchart, usually paired with an on-page connector by a short label. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a pentagon. Text sits in the rectangular band above the point.",
		summary: "off-page connector (jump to another page)",
	});

export const parallelogramDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: ParallelogramFeatures,
		textRegion: calcParallelogramTextRegion,
		outline: parallelogramOutline,
		defaults: PARALLELOGRAM_DOC_DEFAULTS,
		description:
			"Parallelogram shape (top edge shifted right), typically used for input/output steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a parallelogram. Text is laid out with a small horizontal inset to stay inside the slanted sides.",
		summary: "input / output",
	});

export const stadiumDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: StadiumFeatures,
	textRegion: calcStadiumTextRegion,
	outline: stadiumOutline,
	defaults: STADIUM_DOC_DEFAULTS,
	description:
		"Stadium (pill) shape with fully rounded ends, typically used for start/end terminators in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a stadium. Text is laid out between the semicircular caps, which take the short side off the long one.",
	summary: "start / end terminator",
});

export const storedDataDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: StoredDataFeatures,
		textRegion: calcStoredDataTextRegion,
		outline: storedDataOutline,
		defaults: STORED_DATA_DOC_DEFAULTS,
		description:
			"Stored-data shape (a rectangle whose left/right edges are arcs both bowing left, like a drum segment) — the generic storage symbol for files / caches that are not specifically a database (use DbDoc for databases). Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs. Text is laid out between the two side arcs.",
		summary: "generic stored data (file / cache)",
	});

export const subroutineDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: SubroutineFeatures,
		textRegion: calcSubroutineTextRegion,
		defaults: SUBROUTINE_DOC_DEFAULTS,
		description:
			"Predefined-process (subroutine) box: a rectangle with a vertical bar near each side, for calls to a defined sub-procedure. Uses the same rect-based geometry (x/y/width/height) as RectDoc; text is inset horizontally to stay between the bars.",
		summary: "predefined process / call",
	});

export const trapezoidDocDefinition: ObjectDocDefinition = createFrameObjectDoc(
	{
		features: TrapezoidFeatures,
		textRegion: calcTrapezoidTextRegion,
		outline: trapezoidOutline,
		defaults: TRAPEZOID_DOC_DEFAULTS,
		description:
			"Trapezoid (wide top, narrow bottom), typically used for manual-operation steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a trapezoid.",
		summary: "manual operation",
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
