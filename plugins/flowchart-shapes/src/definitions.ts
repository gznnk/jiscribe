import type { ObjectTypeDefinition } from "@workspace/canvas";
import {
	calcBelowLabelTextRegion,
	calcBelowLabelVisualBounds,
	createFrameObjectDefinition,
} from "@workspace/canvas-sdk";

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
import { Db, calcDbTextRegion, dbOutline } from "./presentation/Db";
import { Delay, calcDelayTextRegion, delayOutline } from "./presentation/Delay";
import {
	Diamond,
	calcDiamondTextRegion,
	diamondOutline,
} from "./presentation/Diamond";
import {
	Display,
	calcDisplayTextRegion,
	displayOutline,
} from "./presentation/Display";
import {
	Document,
	calcDocumentTextRegion,
	documentOutline,
} from "./presentation/Document";
import { Extract, extractOutline } from "./presentation/Extract";
import {
	Hexagon,
	calcHexagonTextRegion,
	hexagonOutline,
} from "./presentation/Hexagon";
import {
	LoopLimit,
	calcLoopLimitAnchorRegion,
	calcLoopLimitTextRegion,
	loopLimitOutline,
} from "./presentation/LoopLimit";
import {
	ManualInput,
	calcManualInputTextRegion,
	manualInputOutline,
} from "./presentation/ManualInput";
import {
	MultiDocument,
	calcMultiDocumentTextRegion,
	multiDocumentOutline,
} from "./presentation/MultiDocument";
import {
	OffPageConnector,
	calcOffPageConnectorAnchorRegion,
	calcOffPageConnectorTextRegion,
	offPageConnectorOutline,
} from "./presentation/OffPageConnector";
import {
	Parallelogram,
	calcParallelogramTextRegion,
	parallelogramOutline,
} from "./presentation/Parallelogram";
import {
	Stadium,
	calcStadiumTextRegion,
	stadiumOutline,
} from "./presentation/Stadium";
import {
	StoredData,
	calcStoredDataTextRegion,
	storedDataOutline,
} from "./presentation/StoredData";
import {
	Subroutine,
	calcSubroutineTextRegion,
} from "./presentation/Subroutine";
import {
	Trapezoid,
	calcTrapezoidTextRegion,
	trapezoidOutline,
} from "./presentation/Trapezoid";
import type { CardDoc } from "./schema/card/CardDoc";
import type { CrossDoc } from "./schema/cross/CrossDoc";
import type { DbDoc } from "./schema/db/DbDoc";
import type { DelayDoc } from "./schema/delay/DelayDoc";
import type { DiamondDoc } from "./schema/diamond/DiamondDoc";
import type { DisplayDoc } from "./schema/display/DisplayDoc";
import type { DocumentDoc } from "./schema/document/DocumentDoc";
import type { ExtractDoc } from "./schema/extract/ExtractDoc";
import type { HexagonDoc } from "./schema/hexagon/HexagonDoc";
import type { LoopLimitDoc } from "./schema/loopLimit/LoopLimitDoc";
import type { ManualInputDoc } from "./schema/manualInput/ManualInputDoc";
import type { MultiDocumentDoc } from "./schema/multiDocument/MultiDocumentDoc";
import type { OffPageConnectorDoc } from "./schema/offPageConnector/OffPageConnectorDoc";
import type { ParallelogramDoc } from "./schema/parallelogram/ParallelogramDoc";
import type { StadiumDoc } from "./schema/stadium/StadiumDoc";
import type { StoredDataDoc } from "./schema/storedData/StoredDataDoc";
import type { SubroutineDoc } from "./schema/subroutine/SubroutineDoc";
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
import { CardStencils } from "./stencil/CardStencils";
import { CrossStencils } from "./stencil/CrossStencils";
import { DbStencils } from "./stencil/DbStencils";
import { DelayStencils } from "./stencil/DelayStencils";
import { DiamondStencils } from "./stencil/DiamondStencils";
import { DisplayStencils } from "./stencil/DisplayStencils";
import { DocumentStencils } from "./stencil/DocumentStencils";
import { ExtractStencils } from "./stencil/ExtractStencils";
import { HexagonStencils } from "./stencil/HexagonStencils";
import { LoopLimitStencils } from "./stencil/LoopLimitStencils";
import { ManualInputStencils } from "./stencil/ManualInputStencils";
import { MultiDocumentStencils } from "./stencil/MultiDocumentStencils";
import { OffPageConnectorStencils } from "./stencil/OffPageConnectorStencils";
import { ParallelogramStencils } from "./stencil/ParallelogramStencils";
import { StadiumStencils } from "./stencil/StadiumStencils";
import { StoredDataStencils } from "./stencil/StoredDataStencils";
import { SubroutineStencils } from "./stencil/SubroutineStencils";
import { TrapezoidStencils } from "./stencil/TrapezoidStencils";

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
		stencils: CardStencils,
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
		stencils: CrossStencils,
	});

export const dbDefinition: ObjectTypeDefinition<DbDoc, DbState> =
	createFrameObjectDefinition<DbDoc, DbState>({
		doc: dbDocDefinition,
		component: Db,
		textRegion: calcDbTextRegion,
		outline: dbOutline,
		stencils: DbStencils,
	});

export const delayDefinition: ObjectTypeDefinition<DelayDoc, DelayState> =
	createFrameObjectDefinition<DelayDoc, DelayState>({
		doc: delayDocDefinition,
		component: Delay,
		textRegion: calcDelayTextRegion,
		outline: delayOutline,
		stencils: DelayStencils,
	});

export const diamondDefinition: ObjectTypeDefinition<DiamondDoc, DiamondState> =
	createFrameObjectDefinition<DiamondDoc, DiamondState>({
		doc: diamondDocDefinition,
		component: Diamond,
		textRegion: calcDiamondTextRegion,
		outline: diamondOutline,
		stencils: DiamondStencils,
	});

export const displayDefinition: ObjectTypeDefinition<DisplayDoc, DisplayState> =
	createFrameObjectDefinition<DisplayDoc, DisplayState>({
		doc: displayDocDefinition,
		component: Display,
		textRegion: calcDisplayTextRegion,
		outline: displayOutline,
		stencils: DisplayStencils,
	});

export const documentDefinition: ObjectTypeDefinition<
	DocumentDoc,
	DocumentState
> = createFrameObjectDefinition<DocumentDoc, DocumentState>({
	doc: documentDocDefinition,
	component: Document,
	textRegion: calcDocumentTextRegion,
	outline: documentOutline,
	stencils: DocumentStencils,
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
		stencils: ExtractStencils,
	});

export const hexagonDefinition: ObjectTypeDefinition<HexagonDoc, HexagonState> =
	createFrameObjectDefinition<HexagonDoc, HexagonState>({
		doc: hexagonDocDefinition,
		component: Hexagon,
		textRegion: calcHexagonTextRegion,
		outline: hexagonOutline,
		stencils: HexagonStencils,
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
	stencils: LoopLimitStencils,
});

export const manualInputDefinition: ObjectTypeDefinition<
	ManualInputDoc,
	ManualInputState
> = createFrameObjectDefinition<ManualInputDoc, ManualInputState>({
	doc: manualInputDocDefinition,
	component: ManualInput,
	textRegion: calcManualInputTextRegion,
	outline: manualInputOutline,
	stencils: ManualInputStencils,
});

export const multiDocumentDefinition: ObjectTypeDefinition<
	MultiDocumentDoc,
	MultiDocumentState
> = createFrameObjectDefinition<MultiDocumentDoc, MultiDocumentState>({
	doc: multiDocumentDocDefinition,
	component: MultiDocument,
	textRegion: calcMultiDocumentTextRegion,
	outline: multiDocumentOutline,
	stencils: MultiDocumentStencils,
});

export const offPageConnectorDefinition: ObjectTypeDefinition<
	OffPageConnectorDoc,
	OffPageConnectorState
> = createFrameObjectDefinition<OffPageConnectorDoc, OffPageConnectorState>({
	doc: offPageConnectorDocDefinition,
	component: OffPageConnector,
	textRegion: calcOffPageConnectorTextRegion,
	outline: offPageConnectorOutline,
	anchorRegion: calcOffPageConnectorAnchorRegion,
	stencils: OffPageConnectorStencils,
});

export const parallelogramDefinition: ObjectTypeDefinition<
	ParallelogramDoc,
	ParallelogramState
> = createFrameObjectDefinition<ParallelogramDoc, ParallelogramState>({
	doc: parallelogramDocDefinition,
	component: Parallelogram,
	textRegion: calcParallelogramTextRegion,
	outline: parallelogramOutline,
	stencils: ParallelogramStencils,
});

export const stadiumDefinition: ObjectTypeDefinition<StadiumDoc, StadiumState> =
	createFrameObjectDefinition<StadiumDoc, StadiumState>({
		doc: stadiumDocDefinition,
		component: Stadium,
		textRegion: calcStadiumTextRegion,
		outline: stadiumOutline,
		stencils: StadiumStencils,
	});

export const storedDataDefinition: ObjectTypeDefinition<
	StoredDataDoc,
	StoredDataState
> = createFrameObjectDefinition<StoredDataDoc, StoredDataState>({
	doc: storedDataDocDefinition,
	component: StoredData,
	textRegion: calcStoredDataTextRegion,
	outline: storedDataOutline,
	stencils: StoredDataStencils,
});

export const subroutineDefinition: ObjectTypeDefinition<
	SubroutineDoc,
	SubroutineState
> = createFrameObjectDefinition<SubroutineDoc, SubroutineState>({
	doc: subroutineDocDefinition,
	component: Subroutine,
	textRegion: calcSubroutineTextRegion,
	stencils: SubroutineStencils,
});

export const trapezoidDefinition: ObjectTypeDefinition<
	TrapezoidDoc,
	TrapezoidState
> = createFrameObjectDefinition<TrapezoidDoc, TrapezoidState>({
	doc: trapezoidDocDefinition,
	component: Trapezoid,
	textRegion: calcTrapezoidTextRegion,
	outline: trapezoidOutline,
	stencils: TrapezoidStencils,
});
