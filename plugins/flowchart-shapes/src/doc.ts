// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の
// Node 側診断など、definitions.ts（React コンポーネントを含む）を経由せずに parse-time
// 検証へ参加したい消費者のための入口。import は ./schema/** と @workspace/canvas/doc /
// @workspace/canvas-sdk/doc のみで、presentation / state / stencil を引き込まない。
// description / summary / outlineDescription / defaults are the single source of
// the generated JSON schema and AI docs (pnpm generate:ai).
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@workspace/canvas/doc";

import { CARD_DOC_DEFAULTS, CardFeatures } from "./schema/card/CardDoc";
import { CardObjectFactory } from "./schema/card/CardObjectFactory";
import { validateCardDoc } from "./schema/card/validateCardDoc";
import { CROSS_DOC_DEFAULTS, CrossFeatures } from "./schema/cross/CrossDoc";
import { CrossObjectFactory } from "./schema/cross/CrossObjectFactory";
import { validateCrossDoc } from "./schema/cross/validateCrossDoc";
import { DB_DOC_DEFAULTS, DbFeatures } from "./schema/db/DbDoc";
import { DbObjectFactory } from "./schema/db/DbObjectFactory";
import { validateDbDoc } from "./schema/db/validateDbDoc";
import { DELAY_DOC_DEFAULTS, DelayFeatures } from "./schema/delay/DelayDoc";
import { DelayObjectFactory } from "./schema/delay/DelayObjectFactory";
import { validateDelayDoc } from "./schema/delay/validateDelayDoc";
import {
	DIAMOND_DOC_DEFAULTS,
	DiamondFeatures,
} from "./schema/diamond/DiamondDoc";
import { DiamondObjectFactory } from "./schema/diamond/DiamondObjectFactory";
import { validateDiamondDoc } from "./schema/diamond/validateDiamondDoc";
import {
	DISPLAY_DOC_DEFAULTS,
	DisplayFeatures,
} from "./schema/display/DisplayDoc";
import { DisplayObjectFactory } from "./schema/display/DisplayObjectFactory";
import { validateDisplayDoc } from "./schema/display/validateDisplayDoc";
import {
	DOCUMENT_DOC_DEFAULTS,
	DocumentFeatures,
} from "./schema/document/DocumentDoc";
import { DocumentObjectFactory } from "./schema/document/DocumentObjectFactory";
import { validateDocumentDoc } from "./schema/document/validateDocumentDoc";
import {
	EXTRACT_DOC_DEFAULTS,
	ExtractFeatures,
} from "./schema/extract/ExtractDoc";
import { ExtractObjectFactory } from "./schema/extract/ExtractObjectFactory";
import { validateExtractDoc } from "./schema/extract/validateExtractDoc";
import {
	HEXAGON_DOC_DEFAULTS,
	HexagonFeatures,
} from "./schema/hexagon/HexagonDoc";
import { HexagonObjectFactory } from "./schema/hexagon/HexagonObjectFactory";
import { validateHexagonDoc } from "./schema/hexagon/validateHexagonDoc";
import {
	LOOP_LIMIT_DOC_DEFAULTS,
	LoopLimitFeatures,
} from "./schema/loopLimit/LoopLimitDoc";
import { LoopLimitObjectFactory } from "./schema/loopLimit/LoopLimitObjectFactory";
import { validateLoopLimitDoc } from "./schema/loopLimit/validateLoopLimitDoc";
import {
	MANUAL_INPUT_DOC_DEFAULTS,
	ManualInputFeatures,
} from "./schema/manualInput/ManualInputDoc";
import { ManualInputObjectFactory } from "./schema/manualInput/ManualInputObjectFactory";
import { validateManualInputDoc } from "./schema/manualInput/validateManualInputDoc";
import {
	MULTI_DOCUMENT_DOC_DEFAULTS,
	MultiDocumentFeatures,
} from "./schema/multiDocument/MultiDocumentDoc";
import { MultiDocumentObjectFactory } from "./schema/multiDocument/MultiDocumentObjectFactory";
import { validateMultiDocumentDoc } from "./schema/multiDocument/validateMultiDocumentDoc";
import {
	OFF_PAGE_CONNECTOR_DOC_DEFAULTS,
	OffPageConnectorFeatures,
} from "./schema/offPageConnector/OffPageConnectorDoc";
import { OffPageConnectorObjectFactory } from "./schema/offPageConnector/OffPageConnectorObjectFactory";
import { validateOffPageConnectorDoc } from "./schema/offPageConnector/validateOffPageConnectorDoc";
import {
	PARALLELOGRAM_DOC_DEFAULTS,
	ParallelogramFeatures,
} from "./schema/parallelogram/ParallelogramDoc";
import { ParallelogramObjectFactory } from "./schema/parallelogram/ParallelogramObjectFactory";
import { validateParallelogramDoc } from "./schema/parallelogram/validateParallelogramDoc";
import {
	STADIUM_DOC_DEFAULTS,
	StadiumFeatures,
} from "./schema/stadium/StadiumDoc";
import { StadiumObjectFactory } from "./schema/stadium/StadiumObjectFactory";
import { validateStadiumDoc } from "./schema/stadium/validateStadiumDoc";
import {
	STORED_DATA_DOC_DEFAULTS,
	StoredDataFeatures,
} from "./schema/storedData/StoredDataDoc";
import { StoredDataObjectFactory } from "./schema/storedData/StoredDataObjectFactory";
import { validateStoredDataDoc } from "./schema/storedData/validateStoredDataDoc";
import {
	SUBROUTINE_DOC_DEFAULTS,
	SubroutineFeatures,
} from "./schema/subroutine/SubroutineDoc";
import { SubroutineObjectFactory } from "./schema/subroutine/SubroutineObjectFactory";
import { validateSubroutineDoc } from "./schema/subroutine/validateSubroutineDoc";
import {
	TRAPEZOID_DOC_DEFAULTS,
	TrapezoidFeatures,
} from "./schema/trapezoid/TrapezoidDoc";
import { TrapezoidObjectFactory } from "./schema/trapezoid/TrapezoidObjectFactory";
import { validateTrapezoidDoc } from "./schema/trapezoid/validateTrapezoidDoc";

export const cardDocDefinition: ObjectDocDefinition = {
	features: CardFeatures,
	validateDoc: validateCardDoc,
	factory: CardObjectFactory,
	description:
		"Card: a rectangle with the top-left corner cut off, used for punched-card style data in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc.",
	summary: "punched-card style data",
	outlineDescription: "Rectangle with the top-left corner cut off",
	defaults: CARD_DOC_DEFAULTS,
};

export const crossDocDefinition: ObjectDocDefinition = {
	features: CrossFeatures,
	validateDoc: validateCrossDoc,
	factory: CrossObjectFactory,
	description:
		"Cross (plus) marker, used to mark junctions and for emphasis. Uses the same rect-based geometry (x/y/width/height) as RectDoc. The arms fill the whole box and the text is drawn as a label below it, auto-sized to the text itself — so the box does not need to be widened for a long note, and leaving the text out keeps a bare marker.",
	summary: "junction / emphasis marker",
	outlineDescription: "Plus sign, label below",
	defaults: CROSS_DOC_DEFAULTS,
};

export const dbDocDefinition: ObjectDocDefinition = {
	features: DbFeatures,
	validateDoc: validateDbDoc,
	factory: DbObjectFactory,
	description:
		"Database cylinder shape, typically used for data stores in architecture or ER diagrams. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a cylinder. Text is laid out in the body region below the top cap ellipse (not the full bounding box).",
	summary: "data store",
	defaults: DB_DOC_DEFAULTS,
};

export const delayDocDefinition: ObjectDocDefinition = {
	features: DelayFeatures,
	validateDoc: validateDelayDoc,
	factory: DelayObjectFactory,
	description:
		"Delay shape: a rectangle whose right edge is a semicircular bulge, used for wait/delay steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc.",
	summary: "wait / delay",
	outlineDescription: "Rectangle whose right edge is a semicircle",
	defaults: DELAY_DOC_DEFAULTS,
};

export const diamondDocDefinition: ObjectDocDefinition = {
	features: DiamondFeatures,
	validateDoc: validateDiamondDoc,
	factory: DiamondObjectFactory,
	description:
		"Diamond (rhombus) shape, typically used for decision/branch nodes in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a diamond. Text is laid out within the full bounding box (not clipped to the diamond interior).",
	summary: "decision / branch node",
	defaults: DIAMOND_DOC_DEFAULTS,
};

export const displayDocDefinition: ObjectDocDefinition = {
	features: DisplayFeatures,
	validateDoc: validateDisplayDoc,
	factory: DisplayObjectFactory,
	description:
		"Display shape with a pointed left edge and a rounded right cap, used for output-to-display steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc.",
	summary: "output to a display",
	outlineDescription: "Pointed left edge, rounded right cap",
	defaults: DISPLAY_DOC_DEFAULTS,
};

export const documentDocDefinition: ObjectDocDefinition = {
	features: DocumentFeatures,
	validateDoc: validateDocumentDoc,
	factory: DocumentObjectFactory,
	description:
		"Document shape (rect with a wavy bottom edge), typically used for reports/files in flowcharts or deliverables in business diagrams. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a document. Text is laid out above the bottom wave band.",
	summary: "report, file",
	defaults: DOCUMENT_DOC_DEFAULTS,
};

export const extractDocDefinition: ObjectDocDefinition = {
	features: ExtractFeatures,
	validateDoc: validateExtractDoc,
	factory: ExtractObjectFactory,
	description:
		'The flowchart "extract" symbol — an upward triangle (apex at the top), used for extract/merge/marker nodes. Uses the same rect-based geometry (x/y/width/height) as RectDoc. The triangle fills the whole box and the text is drawn as a label below it, auto-sized to the text itself — so the box does not need to be widened for a long name, and leaving the text out keeps a bare marker.',
	summary: "extract / merge marker",
	outlineDescription: "Upward triangle, apex at the top, label below",
	defaults: EXTRACT_DOC_DEFAULTS,
};

export const hexagonDocDefinition: ObjectDocDefinition = {
	features: HexagonFeatures,
	validateDoc: validateHexagonDoc,
	factory: HexagonObjectFactory,
	description:
		"Hexagon shape with pointed left/right caps, typically used for preparation steps in flowcharts or emphasis nodes. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a hexagon. Text is laid out with a small horizontal inset to stay inside the caps.",
	summary: "preparation",
	defaults: HEXAGON_DOC_DEFAULTS,
};

export const loopLimitDocDefinition: ObjectDocDefinition = {
	features: LoopLimitFeatures,
	validateDoc: validateLoopLimitDoc,
	factory: LoopLimitObjectFactory,
	description:
		'Loop-limit shape (a rectangle with both top corners cut off), marking the start of a loop in flowcharts; set "flipY": true to mark the loop end. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs. Text sits below the top bevels.',
	summary: 'loop start (`"flipY": true` for the end)',
	outlineDescription: "Rectangle with both top corners cut off",
	defaults: LOOP_LIMIT_DOC_DEFAULTS,
};

export const manualInputDocDefinition: ObjectDocDefinition = {
	features: ManualInputFeatures,
	validateDoc: validateManualInputDoc,
	factory: ManualInputObjectFactory,
	description:
		"Manual-input shape whose top edge slopes up toward the right, used for keyed/manual entry steps. Uses the same rect-based geometry (x/y/width/height) as RectDoc; text sits below the sloping top edge.",
	summary: "manual / keyed input",
	outlineDescription: "Top edge slopes up toward the right",
	defaults: MANUAL_INPUT_DOC_DEFAULTS,
};

export const multiDocumentDocDefinition: ObjectDocDefinition = {
	features: MultiDocumentFeatures,
	validateDoc: validateMultiDocumentDoc,
	factory: MultiDocumentObjectFactory,
	description:
		"Multi-document shape (three stacked document sheets), used for report batches / file sets in flowcharts. The front sheet sits at the bottom-left and the two back sheets step toward the top-right. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs. Text is confined to the front sheet, above its bottom wave band.",
	summary: "report batch / file set",
	outlineDescription: "Three stacked wavy-bottom sheets",
	defaults: MULTI_DOCUMENT_DOC_DEFAULTS,
};

export const offPageConnectorDocDefinition: ObjectDocDefinition = {
	features: OffPageConnectorFeatures,
	validateDoc: validateOffPageConnectorDoc,
	factory: OffPageConnectorObjectFactory,
	description:
		"Off-page connector: a home-plate pentagon (rectangle tapering to a downward point) marking a jump to another page/section of a flowchart, usually paired with an on-page connector by a short label. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a pentagon. Text sits in the rectangular band above the point.",
	summary: "off-page connector (jump to another page)",
	outlineDescription: "Home-plate pentagon pointing down",
	defaults: OFF_PAGE_CONNECTOR_DOC_DEFAULTS,
};

export const parallelogramDocDefinition: ObjectDocDefinition = {
	features: ParallelogramFeatures,
	validateDoc: validateParallelogramDoc,
	factory: ParallelogramObjectFactory,
	description:
		"Parallelogram shape (top edge shifted right), typically used for input/output steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a parallelogram. Text is laid out with a small horizontal inset to stay inside the slanted sides.",
	summary: "input / output",
	defaults: PARALLELOGRAM_DOC_DEFAULTS,
};

export const stadiumDocDefinition: ObjectDocDefinition = {
	features: StadiumFeatures,
	validateDoc: validateStadiumDoc,
	factory: StadiumObjectFactory,
	description:
		"Stadium (pill) shape with fully rounded ends, typically used for start/end terminators in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a stadium. Text is laid out within the full bounding box.",
	summary: "start / end terminator",
	defaults: STADIUM_DOC_DEFAULTS,
};

export const storedDataDocDefinition: ObjectDocDefinition = {
	features: StoredDataFeatures,
	validateDoc: validateStoredDataDoc,
	factory: StoredDataObjectFactory,
	description:
		"Stored-data shape (a rectangle whose left/right edges are arcs both bowing left, like a drum segment) — the generic storage symbol for files / caches that are not specifically a database (use DbDoc for databases). Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs. Text is laid out between the two side arcs.",
	summary: "generic stored data (file / cache)",
	outlineDescription: "Rectangle with both side edges bowed left",
	defaults: STORED_DATA_DOC_DEFAULTS,
};

export const subroutineDocDefinition: ObjectDocDefinition = {
	features: SubroutineFeatures,
	validateDoc: validateSubroutineDoc,
	factory: SubroutineObjectFactory,
	description:
		"Predefined-process (subroutine) box: a rectangle with a vertical bar near each side, for calls to a defined sub-procedure. Uses the same rect-based geometry (x/y/width/height) as RectDoc; text is inset horizontally to stay between the bars.",
	summary: "predefined process / call",
	outlineDescription: "Rectangle with a vertical bar near each side",
	defaults: SUBROUTINE_DOC_DEFAULTS,
};

export const trapezoidDocDefinition: ObjectDocDefinition = {
	features: TrapezoidFeatures,
	validateDoc: validateTrapezoidDoc,
	factory: TrapezoidObjectFactory,
	description:
		"Trapezoid (wide top, narrow bottom), typically used for manual-operation steps in flowcharts. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a trapezoid.",
	summary: "manual operation",
	outlineDescription: "Wide top, narrow bottom",
	defaults: TRAPEZOID_DOC_DEFAULTS,
};

/**
 * Headless `CanvasDocPlugin` for the flowchart shapes: the doc-layer view of
 * `flowchartPlugin`, teaching `createCanvasParser` the 18 types without loading
 * any React / presentation code (docs/05_extensibility/plugin-architecture-requirements.md).
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
