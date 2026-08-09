import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import {
	calcBelowLabelTextRegion,
	calcBelowLabelVisualBounds,
	createFrameObjectDefinition,
	createInsetTextRegion,
	createTypeStencils,
} from "@jiscribe/canvas-sdk";

import {
	cardDocDefinition,
	crossDocDefinition,
	dbDocDefinition,
	delayDocDefinition,
	diamondDocDefinition,
	displayDocDefinition,
	documentDocDefinition,
	extractDocDefinition,
	hexagonDocDefinition,
	loopLimitDocDefinition,
	manualInputDocDefinition,
	multiDocumentDocDefinition,
	offPageConnectorDocDefinition,
	parallelogramDocDefinition,
	stadiumDocDefinition,
	storedDataDocDefinition,
	subroutineDocDefinition,
	trapezoidDocDefinition,
} from "./doc";
import { Card, calcCardTextRegion, cardOutline } from "./presentation/Card";
import { Cross, crossOutline } from "./presentation/Cross";
import { Db, dbOutline } from "./presentation/Db";
import { Delay, calcDelayTextRegion, delayOutline } from "./presentation/Delay";
import { Diamond, diamondOutline } from "./presentation/Diamond";
import { Display, displayOutline } from "./presentation/Display";
import { Document, documentOutline } from "./presentation/Document";
import { Extract, extractOutline } from "./presentation/Extract";
import { Hexagon, hexagonOutline } from "./presentation/Hexagon";
import {
	LoopLimit,
	calcLoopLimitAnchorRegion,
	calcLoopLimitTextRegion,
	loopLimitOutline,
} from "./presentation/LoopLimit";
import { ManualInput, manualInputOutline } from "./presentation/ManualInput";
import {
	MultiDocument,
	calcMultiDocumentTextRegion,
	multiDocumentOutline,
} from "./presentation/MultiDocument";
import {
	OffPageConnector,
	calcOffPageConnectorAnchorRegion,
	offPageConnectorOutline,
} from "./presentation/OffPageConnector";
import {
	Parallelogram,
	parallelogramOutline,
} from "./presentation/Parallelogram";
import {
	Stadium,
	calcStadiumTextRegion,
	stadiumOutline,
} from "./presentation/Stadium";
import { StoredData, storedDataOutline } from "./presentation/StoredData";
import { Subroutine } from "./presentation/Subroutine";
import { Trapezoid, trapezoidOutline } from "./presentation/Trapezoid";
import type { CardDoc } from "./schema/card/CardDoc";
import type { CrossDoc } from "./schema/cross/CrossDoc";
import { DB_CAP_RATIO } from "./schema/db/DbDoc";
import type { DbDoc } from "./schema/db/DbDoc";
import type { DelayDoc } from "./schema/delay/DelayDoc";
import { DIAMOND_INSET } from "./schema/diamond/DiamondDoc";
import type { DiamondDoc } from "./schema/diamond/DiamondDoc";
import {
	DISPLAY_CAP_RATIO,
	DISPLAY_LEFT_RATIO,
} from "./schema/display/DisplayDoc";
import type { DisplayDoc } from "./schema/display/DisplayDoc";
import { DOCUMENT_WAVE_RATIO } from "./schema/document/DocumentDoc";
import type { DocumentDoc } from "./schema/document/DocumentDoc";
import type { ExtractDoc } from "./schema/extract/ExtractDoc";
import { HEXAGON_CAP_RATIO } from "./schema/hexagon/HexagonDoc";
import type { HexagonDoc } from "./schema/hexagon/HexagonDoc";
import type { LoopLimitDoc } from "./schema/loopLimit/LoopLimitDoc";
import { MANUAL_INPUT_SLOPE_RATIO } from "./schema/manualInput/ManualInputDoc";
import type { ManualInputDoc } from "./schema/manualInput/ManualInputDoc";
import type { MultiDocumentDoc } from "./schema/multiDocument/MultiDocumentDoc";
import { OFF_PAGE_CONNECTOR_TIP_RATIO } from "./schema/offPageConnector/OffPageConnectorDoc";
import type { OffPageConnectorDoc } from "./schema/offPageConnector/OffPageConnectorDoc";
import { PARALLELOGRAM_SKEW_RATIO } from "./schema/parallelogram/ParallelogramDoc";
import type { ParallelogramDoc } from "./schema/parallelogram/ParallelogramDoc";
import type { StadiumDoc } from "./schema/stadium/StadiumDoc";
import { STORED_DATA_CAP_RATIO } from "./schema/storedData/StoredDataDoc";
import type { StoredDataDoc } from "./schema/storedData/StoredDataDoc";
import { SUBROUTINE_BAR_RATIO } from "./schema/subroutine/SubroutineDoc";
import type { SubroutineDoc } from "./schema/subroutine/SubroutineDoc";
import { TRAPEZOID_SLOPE_RATIO } from "./schema/trapezoid/TrapezoidDoc";
import type { TrapezoidDoc } from "./schema/trapezoid/TrapezoidDoc";
import type { CardState } from "./state/card/CardState";
import type { CrossState } from "./state/cross/CrossState";
import type { DbState } from "./state/db/DbState";
import type { DelayState } from "./state/delay/DelayState";
import type { DiamondState } from "./state/diamond/DiamondState";
import type { DisplayState } from "./state/display/DisplayState";
import type { DocumentState } from "./state/document/DocumentState";
import type { ExtractState } from "./state/extract/ExtractState";
import type { HexagonState } from "./state/hexagon/HexagonState";
import type { LoopLimitState } from "./state/loopLimit/LoopLimitState";
import type { ManualInputState } from "./state/manualInput/ManualInputState";
import type { MultiDocumentState } from "./state/multiDocument/MultiDocumentState";
import type { OffPageConnectorState } from "./state/offPageConnector/OffPageConnectorState";
import type { ParallelogramState } from "./state/parallelogram/ParallelogramState";
import type { StadiumState } from "./state/stadium/StadiumState";
import type { StoredDataState } from "./state/storedData/StoredDataState";
import type { SubroutineState } from "./state/subroutine/SubroutineState";
import type { TrapezoidState } from "./state/trapezoid/TrapezoidState";
import { CardIcon } from "./stencil/CardIcon";
import { CrossIcon } from "./stencil/CrossIcon";
import { DbIcon } from "./stencil/DbIcon";
import { DelayIcon } from "./stencil/DelayIcon";
import { DiamondIcon } from "./stencil/DiamondIcon";
import { DisplayIcon } from "./stencil/DisplayIcon";
import { DocumentIcon } from "./stencil/DocumentIcon";
import { ExtractIcon } from "./stencil/ExtractIcon";
import { HexagonIcon } from "./stencil/HexagonIcon";
import { LoopLimitIcon } from "./stencil/LoopLimitIcon";
import { ManualInputIcon } from "./stencil/ManualInputIcon";
import { MultiDocumentIcon } from "./stencil/MultiDocumentIcon";
import { OffPageConnectorIcon } from "./stencil/OffPageConnectorIcon";
import { ParallelogramIcon } from "./stencil/ParallelogramIcon";
import { StadiumIcon } from "./stencil/StadiumIcon";
import { StoredDataIcon } from "./stencil/StoredDataIcon";
import { SubroutineIcon } from "./stencil/SubroutineIcon";
import { TrapezoidIcon } from "./stencil/TrapezoidIcon";

/**
 * flowchart 18 図形の `ObjectTypeDefinition` 群。各定義は `./doc` の headless doc 定義
 * (features / validateDoc / factory) に render / interaction / editor UI 部を
 * `createFrameObjectDefinition`（mapper / stateValidator / behavior を features から
 * 導出）で足して合成する。core の登録エントリ (initializeObjectRegistry.ts の
 * ALL_OBJECT_DEFINITIONS) と 1:1 で、意図的除外はない。menu は未宣言なので features から
 * 既定メニューが導出される (docs/05_extensibility/plugin-architecture-requirements.md)。
 */
export const cardDefinition: ObjectTypeDefinition<CardDoc, CardState> =
	createFrameObjectDefinition<CardDoc, CardState>({
		doc: cardDocDefinition,
		component: Card,
		textRegion: calcCardTextRegion,
		outline: cardOutline,
		stencils: createTypeStencils({
			objectType: "card",
			label: { en: "Card", ja: "カード" },
			icon: CardIcon,
		}),
	});

/**
 * The arms fill the box, so the label hangs below the geometry box and
 * `visualBounds` is what keeps zoom-to-fit and the export viewBox from cropping
 * it (calcBelowLabelVisualBounds).
 */
export const crossDefinition: ObjectTypeDefinition<CrossDoc, CrossState> =
	createFrameObjectDefinition<CrossDoc, CrossState>({
		doc: crossDocDefinition,
		component: Cross,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		outline: crossOutline,
		stencils: createTypeStencils({
			objectType: "cross",
			label: { en: "Junction", ja: "接合点" },
			icon: CrossIcon,
		}),
	});

export const dbDefinition: ObjectTypeDefinition<DbDoc, DbState> =
	createFrameObjectDefinition<DbDoc, DbState>({
		doc: dbDocDefinition,
		component: Db,
		// Restricts to the straight-sided cylinder body: below the full top cap
		// ellipse (2 * DB_CAP_RATIO) and above the bottom bulge (DB_CAP_RATIO), so
		// text never spills over the curved bottom at any aspect ratio.
		textRegion: createInsetTextRegion({
			top: DB_CAP_RATIO * 2,
			bottom: DB_CAP_RATIO,
		}),
		outline: dbOutline,
		stencils: createTypeStencils({
			objectType: "db",
			label: { en: "Database", ja: "データベース" },
			icon: DbIcon,
		}),
	});

export const delayDefinition: ObjectTypeDefinition<DelayDoc, DelayState> =
	createFrameObjectDefinition<DelayDoc, DelayState>({
		doc: delayDocDefinition,
		component: Delay,
		textRegion: calcDelayTextRegion,
		outline: delayOutline,
		stencils: createTypeStencils({
			objectType: "delay",
			label: { en: "Delay", ja: "遅延" },
			icon: DelayIcon,
		}),
	});

export const diamondDefinition: ObjectTypeDefinition<DiamondDoc, DiamondState> =
	createFrameObjectDefinition<DiamondDoc, DiamondState>({
		doc: diamondDocDefinition,
		component: Diamond,
		textRegion: createInsetTextRegion({
			top: DIAMOND_INSET,
			right: DIAMOND_INSET,
			bottom: DIAMOND_INSET,
			left: DIAMOND_INSET,
		}),
		outline: diamondOutline,
		stencils: createTypeStencils({
			objectType: "diamond",
			// Labelled "Decision" for its flowchart role; the type stays the generic
			// geometric `diamond` (it only ever appears in the flowchart category).
			label: { en: "Decision", ja: "判断" },
			icon: DiamondIcon,
		}),
	});

export const displayDefinition: ObjectTypeDefinition<DisplayDoc, DisplayState> =
	createFrameObjectDefinition<DisplayDoc, DisplayState>({
		doc: displayDocDefinition,
		component: Display,
		// Insets the pointed left and rounded right so text sits in the flat middle band.
		textRegion: createInsetTextRegion({
			left: DISPLAY_LEFT_RATIO,
			right: DISPLAY_CAP_RATIO,
		}),
		outline: displayOutline,
		stencils: createTypeStencils({
			objectType: "display",
			label: { en: "Display", ja: "表示" },
			icon: DisplayIcon,
		}),
	});

export const documentDefinition: ObjectTypeDefinition<
	DocumentDoc,
	DocumentState
> = createFrameObjectDefinition<DocumentDoc, DocumentState>({
	doc: documentDocDefinition,
	component: Document,
	// Stops the region above the wavy bottom edge (the wave swings one
	// amplitude around its centerline).
	textRegion: createInsetTextRegion({ bottom: DOCUMENT_WAVE_RATIO * 2 }),
	outline: documentOutline,
	stencils: createTypeStencils({
		objectType: "document",
		label: { en: "Document", ja: "書類" },
		icon: DocumentIcon,
	}),
});

/**
 * The triangle narrows to a point, so the label hangs below the geometry box and
 * `visualBounds` is what keeps zoom-to-fit and the export viewBox from cropping
 * it (calcBelowLabelVisualBounds).
 */
export const extractDefinition: ObjectTypeDefinition<ExtractDoc, ExtractState> =
	createFrameObjectDefinition<ExtractDoc, ExtractState>({
		doc: extractDocDefinition,
		component: Extract,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		outline: extractOutline,
		stencils: createTypeStencils({
			objectType: "extract",
			label: { en: "Extract", ja: "抽出" },
			icon: ExtractIcon,
		}),
	});

export const hexagonDefinition: ObjectTypeDefinition<HexagonDoc, HexagonState> =
	createFrameObjectDefinition<HexagonDoc, HexagonState>({
		doc: hexagonDocDefinition,
		component: Hexagon,
		// Insets by a full cap on both sides so the region aligns with the
		// top/bottom edges between the pointed caps.
		textRegion: createInsetTextRegion({
			left: HEXAGON_CAP_RATIO,
			right: HEXAGON_CAP_RATIO,
		}),
		outline: hexagonOutline,
		stencils: createTypeStencils({
			objectType: "hexagon",
			label: { en: "Preparation", ja: "準備" },
			icon: HexagonIcon,
		}),
	});

export const loopLimitDefinition: ObjectTypeDefinition<
	LoopLimitDoc,
	LoopLimitState
> = createFrameObjectDefinition<LoopLimitDoc, LoopLimitState>({
	doc: loopLimitDocDefinition,
	component: LoopLimit,
	textRegion: calcLoopLimitTextRegion,
	outline: loopLimitOutline,
	anchorRegion: calcLoopLimitAnchorRegion,
	stencils: createTypeStencils({
		objectType: "loopLimit",
		label: { en: "Loop Limit", ja: "ループ端" },
		icon: LoopLimitIcon,
	}),
});

export const manualInputDefinition: ObjectTypeDefinition<
	ManualInputDoc,
	ManualInputState
> = createFrameObjectDefinition<ManualInputDoc, ManualInputState>({
	doc: manualInputDocDefinition,
	component: ManualInput,
	// Insets the top by the full slope so text stays below the sloping top edge.
	textRegion: createInsetTextRegion({ top: MANUAL_INPUT_SLOPE_RATIO }),
	outline: manualInputOutline,
	stencils: createTypeStencils({
		objectType: "manualInput",
		label: { en: "Manual Input", ja: "手動入力" },
		icon: ManualInputIcon,
	}),
});

export const multiDocumentDefinition: ObjectTypeDefinition<
	MultiDocumentDoc,
	MultiDocumentState
> = createFrameObjectDefinition<MultiDocumentDoc, MultiDocumentState>({
	doc: multiDocumentDocDefinition,
	component: MultiDocument,
	textRegion: calcMultiDocumentTextRegion,
	outline: multiDocumentOutline,
	stencils: createTypeStencils({
		objectType: "multiDocument",
		label: { en: "Multi-document", ja: "複数書類" },
		icon: MultiDocumentIcon,
	}),
});

export const offPageConnectorDefinition: ObjectTypeDefinition<
	OffPageConnectorDoc,
	OffPageConnectorState
> = createFrameObjectDefinition<OffPageConnectorDoc, OffPageConnectorState>({
	doc: offPageConnectorDocDefinition,
	component: OffPageConnector,
	// Insets the bottom by a full tip height so text stays in the rectangular
	// band above the point.
	textRegion: createInsetTextRegion({ bottom: OFF_PAGE_CONNECTOR_TIP_RATIO }),
	outline: offPageConnectorOutline,
	anchorRegion: calcOffPageConnectorAnchorRegion,
	stencils: createTypeStencils({
		objectType: "offPageConnector",
		label: { en: "Off-page connector", ja: "他ページ結合子" },
		icon: OffPageConnectorIcon,
	}),
});

export const parallelogramDefinition: ObjectTypeDefinition<
	ParallelogramDoc,
	ParallelogramState
> = createFrameObjectDefinition<ParallelogramDoc, ParallelogramState>({
	doc: parallelogramDocDefinition,
	component: Parallelogram,
	// Insets by a full skew on both sides so the region aligns with the
	// slanted left/right edges.
	textRegion: createInsetTextRegion({
		left: PARALLELOGRAM_SKEW_RATIO,
		right: PARALLELOGRAM_SKEW_RATIO,
	}),
	outline: parallelogramOutline,
	stencils: createTypeStencils({
		objectType: "parallelogram",
		label: { en: "Data", ja: "データ" },
		icon: ParallelogramIcon,
	}),
});

export const stadiumDefinition: ObjectTypeDefinition<StadiumDoc, StadiumState> =
	createFrameObjectDefinition<StadiumDoc, StadiumState>({
		doc: stadiumDocDefinition,
		component: Stadium,
		textRegion: calcStadiumTextRegion,
		outline: stadiumOutline,
		stencils: createTypeStencils({
			objectType: "stadium",
			label: { en: "Terminal", ja: "端子" },
			icon: StadiumIcon,
		}),
	});

export const storedDataDefinition: ObjectTypeDefinition<
	StoredDataDoc,
	StoredDataState
> = createFrameObjectDefinition<StoredDataDoc, StoredDataState>({
	doc: storedDataDocDefinition,
	component: StoredData,
	// Insets both sides by the arc depth: the region starts where the straight
	// top/bottom edges begin (left) and stops at the concave right arc's apex.
	textRegion: createInsetTextRegion({
		left: STORED_DATA_CAP_RATIO,
		right: STORED_DATA_CAP_RATIO,
	}),
	outline: storedDataOutline,
	stencils: createTypeStencils({
		objectType: "storedData",
		label: { en: "Stored Data", ja: "記憶データ" },
		icon: StoredDataIcon,
	}),
});

export const subroutineDefinition: ObjectTypeDefinition<
	SubroutineDoc,
	SubroutineState
> = createFrameObjectDefinition<SubroutineDoc, SubroutineState>({
	doc: subroutineDocDefinition,
	component: Subroutine,
	// Insets by one bar width on each side so text sits between the two vertical bars.
	textRegion: createInsetTextRegion({
		left: SUBROUTINE_BAR_RATIO,
		right: SUBROUTINE_BAR_RATIO,
	}),
	stencils: createTypeStencils({
		objectType: "subroutine",
		label: { en: "Subroutine", ja: "サブルーチン" },
		icon: SubroutineIcon,
	}),
});

export const trapezoidDefinition: ObjectTypeDefinition<
	TrapezoidDoc,
	TrapezoidState
> = createFrameObjectDefinition<TrapezoidDoc, TrapezoidState>({
	doc: trapezoidDocDefinition,
	component: Trapezoid,
	// Insets each side by the full slope so the region matches the narrow
	// bottom edge and text never crosses the slanted sides.
	textRegion: createInsetTextRegion({
		left: TRAPEZOID_SLOPE_RATIO,
		right: TRAPEZOID_SLOPE_RATIO,
	}),
	outline: trapezoidOutline,
	stencils: createTypeStencils({
		objectType: "trapezoid",
		label: { en: "Manual Operation", ja: "手操作" },
		icon: TrapezoidIcon,
	}),
});
