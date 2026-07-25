import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

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
import { cardToDoc, cardToState } from "./state/card/CardMapper";
import type { CardState } from "./state/card/CardState";
import { isValidCardState } from "./state/card/validateCardState";
import { crossToDoc, crossToState } from "./state/cross/CrossMapper";
import type { CrossState } from "./state/cross/CrossState";
import { isValidCrossState } from "./state/cross/validateCrossState";
import { dbToDoc, dbToState } from "./state/db/DbMapper";
import type { DbState } from "./state/db/DbState";
import { isValidDbState } from "./state/db/validateDbState";
import { delayToDoc, delayToState } from "./state/delay/DelayMapper";
import type { DelayState } from "./state/delay/DelayState";
import { isValidDelayState } from "./state/delay/validateDelayState";
import { diamondToDoc, diamondToState } from "./state/diamond/DiamondMapper";
import type { DiamondState } from "./state/diamond/DiamondState";
import { isValidDiamondState } from "./state/diamond/validateDiamondState";
import { displayToDoc, displayToState } from "./state/display/DisplayMapper";
import type { DisplayState } from "./state/display/DisplayState";
import { isValidDisplayState } from "./state/display/validateDisplayState";
import {
	documentToDoc,
	documentToState,
} from "./state/document/DocumentMapper";
import type { DocumentState } from "./state/document/DocumentState";
import { isValidDocumentState } from "./state/document/validateDocumentState";
import { extractToDoc, extractToState } from "./state/extract/ExtractMapper";
import type { ExtractState } from "./state/extract/ExtractState";
import { isValidExtractState } from "./state/extract/validateExtractState";
import { hexagonToDoc, hexagonToState } from "./state/hexagon/HexagonMapper";
import type { HexagonState } from "./state/hexagon/HexagonState";
import { isValidHexagonState } from "./state/hexagon/validateHexagonState";
import {
	loopLimitToDoc,
	loopLimitToState,
} from "./state/loopLimit/LoopLimitMapper";
import type { LoopLimitState } from "./state/loopLimit/LoopLimitState";
import { isValidLoopLimitState } from "./state/loopLimit/validateLoopLimitState";
import {
	manualInputToDoc,
	manualInputToState,
} from "./state/manualInput/ManualInputMapper";
import type { ManualInputState } from "./state/manualInput/ManualInputState";
import { isValidManualInputState } from "./state/manualInput/validateManualInputState";
import {
	multiDocumentToDoc,
	multiDocumentToState,
} from "./state/multiDocument/MultiDocumentMapper";
import type { MultiDocumentState } from "./state/multiDocument/MultiDocumentState";
import { isValidMultiDocumentState } from "./state/multiDocument/validateMultiDocumentState";
import {
	offPageConnectorToDoc,
	offPageConnectorToState,
} from "./state/offPageConnector/OffPageConnectorMapper";
import type { OffPageConnectorState } from "./state/offPageConnector/OffPageConnectorState";
import { isValidOffPageConnectorState } from "./state/offPageConnector/validateOffPageConnectorState";
import {
	parallelogramToDoc,
	parallelogramToState,
} from "./state/parallelogram/ParallelogramMapper";
import type { ParallelogramState } from "./state/parallelogram/ParallelogramState";
import { isValidParallelogramState } from "./state/parallelogram/validateParallelogramState";
import { stadiumToDoc, stadiumToState } from "./state/stadium/StadiumMapper";
import type { StadiumState } from "./state/stadium/StadiumState";
import { isValidStadiumState } from "./state/stadium/validateStadiumState";
import {
	storedDataToDoc,
	storedDataToState,
} from "./state/storedData/StoredDataMapper";
import type { StoredDataState } from "./state/storedData/StoredDataState";
import { isValidStoredDataState } from "./state/storedData/validateStoredDataState";
import {
	subroutineToDoc,
	subroutineToState,
} from "./state/subroutine/SubroutineMapper";
import type { SubroutineState } from "./state/subroutine/SubroutineState";
import { isValidSubroutineState } from "./state/subroutine/validateSubroutineState";
import {
	trapezoidToDoc,
	trapezoidToState,
} from "./state/trapezoid/TrapezoidMapper";
import type { TrapezoidState } from "./state/trapezoid/TrapezoidState";
import { isValidTrapezoidState } from "./state/trapezoid/validateTrapezoidState";
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
 * (features / validateDoc / factory) を spread し、render / interaction / editor UI 部を
 * 足して合成する。core の登録エントリ (initializeObjectRegistry.ts の
 * ALL_OBJECT_DEFINITIONS) と 1:1 で、意図的除外はない。menu は未宣言なので features から
 * 既定メニューが導出される (docs/05_extensibility/plugin-architecture-requirements.md)。
 */
export const cardDefinition: ObjectTypeDefinition<CardDoc, CardState> = {
	...cardDocDefinition,
	mapper: { toDoc: cardToDoc, toState: cardToState },
	stateValidator: isValidCardState,
	component: Card,
	textRegion: calcCardTextRegion,
	outline: cardOutline,
	behavior: createFrameBehavior<CardState>(),
	stencils: CardStencils,
};

export const crossDefinition: ObjectTypeDefinition<CrossDoc, CrossState> = {
	...crossDocDefinition,
	mapper: { toDoc: crossToDoc, toState: crossToState },
	stateValidator: isValidCrossState,
	component: Cross,
	outline: crossOutline,
	behavior: createFrameBehavior<CrossState>(),
	stencils: CrossStencils,
};

export const dbDefinition: ObjectTypeDefinition<DbDoc, DbState> = {
	...dbDocDefinition,
	mapper: { toDoc: dbToDoc, toState: dbToState },
	stateValidator: isValidDbState,
	component: Db,
	textRegion: calcDbTextRegion,
	outline: dbOutline,
	behavior: createFrameBehavior<DbState>(),
	stencils: DbStencils,
};

export const delayDefinition: ObjectTypeDefinition<DelayDoc, DelayState> = {
	...delayDocDefinition,
	mapper: { toDoc: delayToDoc, toState: delayToState },
	stateValidator: isValidDelayState,
	component: Delay,
	textRegion: calcDelayTextRegion,
	outline: delayOutline,
	behavior: createFrameBehavior<DelayState>(),
	stencils: DelayStencils,
};

export const diamondDefinition: ObjectTypeDefinition<DiamondDoc, DiamondState> =
	{
		...diamondDocDefinition,
		mapper: { toDoc: diamondToDoc, toState: diamondToState },
		stateValidator: isValidDiamondState,
		component: Diamond,
		textRegion: calcDiamondTextRegion,
		outline: diamondOutline,
		behavior: createFrameBehavior<DiamondState>(),
		stencils: DiamondStencils,
	};

export const displayDefinition: ObjectTypeDefinition<DisplayDoc, DisplayState> =
	{
		...displayDocDefinition,
		mapper: { toDoc: displayToDoc, toState: displayToState },
		stateValidator: isValidDisplayState,
		component: Display,
		textRegion: calcDisplayTextRegion,
		outline: displayOutline,
		behavior: createFrameBehavior<DisplayState>(),
		stencils: DisplayStencils,
	};

export const documentDefinition: ObjectTypeDefinition<
	DocumentDoc,
	DocumentState
> = {
	...documentDocDefinition,
	mapper: { toDoc: documentToDoc, toState: documentToState },
	stateValidator: isValidDocumentState,
	component: Document,
	textRegion: calcDocumentTextRegion,
	outline: documentOutline,
	behavior: createFrameBehavior<DocumentState>(),
	stencils: DocumentStencils,
};

export const extractDefinition: ObjectTypeDefinition<ExtractDoc, ExtractState> =
	{
		...extractDocDefinition,
		mapper: { toDoc: extractToDoc, toState: extractToState },
		stateValidator: isValidExtractState,
		component: Extract,
		outline: extractOutline,
		behavior: createFrameBehavior<ExtractState>(),
		stencils: ExtractStencils,
	};

export const hexagonDefinition: ObjectTypeDefinition<HexagonDoc, HexagonState> =
	{
		...hexagonDocDefinition,
		mapper: { toDoc: hexagonToDoc, toState: hexagonToState },
		stateValidator: isValidHexagonState,
		component: Hexagon,
		textRegion: calcHexagonTextRegion,
		outline: hexagonOutline,
		behavior: createFrameBehavior<HexagonState>(),
		stencils: HexagonStencils,
	};

export const loopLimitDefinition: ObjectTypeDefinition<
	LoopLimitDoc,
	LoopLimitState
> = {
	...loopLimitDocDefinition,
	mapper: { toDoc: loopLimitToDoc, toState: loopLimitToState },
	stateValidator: isValidLoopLimitState,
	component: LoopLimit,
	textRegion: calcLoopLimitTextRegion,
	outline: loopLimitOutline,
	behavior: createFrameBehavior<LoopLimitState>(),
	stencils: LoopLimitStencils,
};

export const manualInputDefinition: ObjectTypeDefinition<
	ManualInputDoc,
	ManualInputState
> = {
	...manualInputDocDefinition,
	mapper: { toDoc: manualInputToDoc, toState: manualInputToState },
	stateValidator: isValidManualInputState,
	component: ManualInput,
	textRegion: calcManualInputTextRegion,
	outline: manualInputOutline,
	behavior: createFrameBehavior<ManualInputState>(),
	stencils: ManualInputStencils,
};

export const multiDocumentDefinition: ObjectTypeDefinition<
	MultiDocumentDoc,
	MultiDocumentState
> = {
	...multiDocumentDocDefinition,
	mapper: { toDoc: multiDocumentToDoc, toState: multiDocumentToState },
	stateValidator: isValidMultiDocumentState,
	component: MultiDocument,
	textRegion: calcMultiDocumentTextRegion,
	outline: multiDocumentOutline,
	behavior: createFrameBehavior<MultiDocumentState>(),
	stencils: MultiDocumentStencils,
};

export const offPageConnectorDefinition: ObjectTypeDefinition<
	OffPageConnectorDoc,
	OffPageConnectorState
> = {
	...offPageConnectorDocDefinition,
	mapper: { toDoc: offPageConnectorToDoc, toState: offPageConnectorToState },
	stateValidator: isValidOffPageConnectorState,
	component: OffPageConnector,
	textRegion: calcOffPageConnectorTextRegion,
	outline: offPageConnectorOutline,
	anchorRegion: calcOffPageConnectorAnchorRegion,
	behavior: createFrameBehavior<OffPageConnectorState>(),
	stencils: OffPageConnectorStencils,
};

export const parallelogramDefinition: ObjectTypeDefinition<
	ParallelogramDoc,
	ParallelogramState
> = {
	...parallelogramDocDefinition,
	mapper: { toDoc: parallelogramToDoc, toState: parallelogramToState },
	stateValidator: isValidParallelogramState,
	component: Parallelogram,
	textRegion: calcParallelogramTextRegion,
	outline: parallelogramOutline,
	behavior: createFrameBehavior<ParallelogramState>(),
	stencils: ParallelogramStencils,
};

export const stadiumDefinition: ObjectTypeDefinition<StadiumDoc, StadiumState> =
	{
		...stadiumDocDefinition,
		mapper: { toDoc: stadiumToDoc, toState: stadiumToState },
		stateValidator: isValidStadiumState,
		component: Stadium,
		textRegion: calcStadiumTextRegion,
		outline: stadiumOutline,
		behavior: createFrameBehavior<StadiumState>(),
		stencils: StadiumStencils,
	};

export const storedDataDefinition: ObjectTypeDefinition<
	StoredDataDoc,
	StoredDataState
> = {
	...storedDataDocDefinition,
	mapper: { toDoc: storedDataToDoc, toState: storedDataToState },
	stateValidator: isValidStoredDataState,
	component: StoredData,
	textRegion: calcStoredDataTextRegion,
	outline: storedDataOutline,
	behavior: createFrameBehavior<StoredDataState>(),
	stencils: StoredDataStencils,
};

export const subroutineDefinition: ObjectTypeDefinition<
	SubroutineDoc,
	SubroutineState
> = {
	...subroutineDocDefinition,
	mapper: { toDoc: subroutineToDoc, toState: subroutineToState },
	stateValidator: isValidSubroutineState,
	component: Subroutine,
	textRegion: calcSubroutineTextRegion,
	behavior: createFrameBehavior<SubroutineState>(),
	stencils: SubroutineStencils,
};

export const trapezoidDefinition: ObjectTypeDefinition<
	TrapezoidDoc,
	TrapezoidState
> = {
	...trapezoidDocDefinition,
	mapper: { toDoc: trapezoidToDoc, toState: trapezoidToState },
	stateValidator: isValidTrapezoidState,
	component: Trapezoid,
	textRegion: calcTrapezoidTextRegion,
	outline: trapezoidOutline,
	behavior: createFrameBehavior<TrapezoidState>(),
	stencils: TrapezoidStencils,
};
