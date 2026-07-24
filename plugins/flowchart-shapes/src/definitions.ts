import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

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
import { CardFeatures } from "./schema/card/CardDoc";
import { CardObjectFactory } from "./schema/card/CardObjectFactory";
import type { CrossDoc } from "./schema/cross/CrossDoc";
import { CrossFeatures } from "./schema/cross/CrossDoc";
import { CrossObjectFactory } from "./schema/cross/CrossObjectFactory";
import type { DbDoc } from "./schema/db/DbDoc";
import { DbFeatures } from "./schema/db/DbDoc";
import { DbObjectFactory } from "./schema/db/DbObjectFactory";
import type { DelayDoc } from "./schema/delay/DelayDoc";
import { DelayFeatures } from "./schema/delay/DelayDoc";
import { DelayObjectFactory } from "./schema/delay/DelayObjectFactory";
import type { DiamondDoc } from "./schema/diamond/DiamondDoc";
import { DiamondFeatures } from "./schema/diamond/DiamondDoc";
import { DiamondObjectFactory } from "./schema/diamond/DiamondObjectFactory";
import type { DisplayDoc } from "./schema/display/DisplayDoc";
import { DisplayFeatures } from "./schema/display/DisplayDoc";
import { DisplayObjectFactory } from "./schema/display/DisplayObjectFactory";
import type { DocumentDoc } from "./schema/document/DocumentDoc";
import { DocumentFeatures } from "./schema/document/DocumentDoc";
import { DocumentObjectFactory } from "./schema/document/DocumentObjectFactory";
import type { ExtractDoc } from "./schema/extract/ExtractDoc";
import { ExtractFeatures } from "./schema/extract/ExtractDoc";
import { ExtractObjectFactory } from "./schema/extract/ExtractObjectFactory";
import type { HexagonDoc } from "./schema/hexagon/HexagonDoc";
import { HexagonFeatures } from "./schema/hexagon/HexagonDoc";
import { HexagonObjectFactory } from "./schema/hexagon/HexagonObjectFactory";
import type { LoopLimitDoc } from "./schema/loopLimit/LoopLimitDoc";
import { LoopLimitFeatures } from "./schema/loopLimit/LoopLimitDoc";
import { LoopLimitObjectFactory } from "./schema/loopLimit/LoopLimitObjectFactory";
import type { ManualInputDoc } from "./schema/manualInput/ManualInputDoc";
import { ManualInputFeatures } from "./schema/manualInput/ManualInputDoc";
import { ManualInputObjectFactory } from "./schema/manualInput/ManualInputObjectFactory";
import type { MultiDocumentDoc } from "./schema/multiDocument/MultiDocumentDoc";
import { MultiDocumentFeatures } from "./schema/multiDocument/MultiDocumentDoc";
import { MultiDocumentObjectFactory } from "./schema/multiDocument/MultiDocumentObjectFactory";
import type { OffPageConnectorDoc } from "./schema/offPageConnector/OffPageConnectorDoc";
import { OffPageConnectorFeatures } from "./schema/offPageConnector/OffPageConnectorDoc";
import { OffPageConnectorObjectFactory } from "./schema/offPageConnector/OffPageConnectorObjectFactory";
import type { ParallelogramDoc } from "./schema/parallelogram/ParallelogramDoc";
import { ParallelogramFeatures } from "./schema/parallelogram/ParallelogramDoc";
import { ParallelogramObjectFactory } from "./schema/parallelogram/ParallelogramObjectFactory";
import type { StadiumDoc } from "./schema/stadium/StadiumDoc";
import { StadiumFeatures } from "./schema/stadium/StadiumDoc";
import { StadiumObjectFactory } from "./schema/stadium/StadiumObjectFactory";
import type { StoredDataDoc } from "./schema/storedData/StoredDataDoc";
import { StoredDataFeatures } from "./schema/storedData/StoredDataDoc";
import { StoredDataObjectFactory } from "./schema/storedData/StoredDataObjectFactory";
import type { SubroutineDoc } from "./schema/subroutine/SubroutineDoc";
import { SubroutineFeatures } from "./schema/subroutine/SubroutineDoc";
import { SubroutineObjectFactory } from "./schema/subroutine/SubroutineObjectFactory";
import type { TrapezoidDoc } from "./schema/trapezoid/TrapezoidDoc";
import { TrapezoidFeatures } from "./schema/trapezoid/TrapezoidDoc";
import { TrapezoidObjectFactory } from "./schema/trapezoid/TrapezoidObjectFactory";
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
 * flowchart 18 図形の `ObjectTypeDefinition` 群。core の登録エントリ
 * (initializeObjectRegistry.ts の ALL_OBJECT_DEFINITIONS) と 1:1 で、意図的除外は
 * ない。menu は未宣言なので features から既定メニューが導出される
 * (docs/05_extensibility/plugin-architecture-requirements.md)。
 */
export const cardDefinition: ObjectTypeDefinition<CardDoc, CardState> = {
	features: CardFeatures,
	mapper: { toDoc: cardToDoc, toState: cardToState },
	stateValidator: isValidCardState,
	factory: CardObjectFactory,
	component: Card,
	textRegion: calcCardTextRegion,
	outline: cardOutline,
	behavior: createFrameBehavior<CardState>(),
	stencils: CardStencils,
};

export const crossDefinition: ObjectTypeDefinition<CrossDoc, CrossState> = {
	features: CrossFeatures,
	mapper: { toDoc: crossToDoc, toState: crossToState },
	stateValidator: isValidCrossState,
	factory: CrossObjectFactory,
	component: Cross,
	outline: crossOutline,
	behavior: createFrameBehavior<CrossState>(),
	stencils: CrossStencils,
};

export const dbDefinition: ObjectTypeDefinition<DbDoc, DbState> = {
	features: DbFeatures,
	mapper: { toDoc: dbToDoc, toState: dbToState },
	stateValidator: isValidDbState,
	factory: DbObjectFactory,
	component: Db,
	textRegion: calcDbTextRegion,
	outline: dbOutline,
	behavior: createFrameBehavior<DbState>(),
	stencils: DbStencils,
};

export const delayDefinition: ObjectTypeDefinition<DelayDoc, DelayState> = {
	features: DelayFeatures,
	mapper: { toDoc: delayToDoc, toState: delayToState },
	stateValidator: isValidDelayState,
	factory: DelayObjectFactory,
	component: Delay,
	textRegion: calcDelayTextRegion,
	outline: delayOutline,
	behavior: createFrameBehavior<DelayState>(),
	stencils: DelayStencils,
};

export const diamondDefinition: ObjectTypeDefinition<DiamondDoc, DiamondState> =
	{
		features: DiamondFeatures,
		mapper: { toDoc: diamondToDoc, toState: diamondToState },
		stateValidator: isValidDiamondState,
		factory: DiamondObjectFactory,
		component: Diamond,
		textRegion: calcDiamondTextRegion,
		outline: diamondOutline,
		behavior: createFrameBehavior<DiamondState>(),
		stencils: DiamondStencils,
	};

export const displayDefinition: ObjectTypeDefinition<DisplayDoc, DisplayState> =
	{
		features: DisplayFeatures,
		mapper: { toDoc: displayToDoc, toState: displayToState },
		stateValidator: isValidDisplayState,
		factory: DisplayObjectFactory,
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
	features: DocumentFeatures,
	mapper: { toDoc: documentToDoc, toState: documentToState },
	stateValidator: isValidDocumentState,
	factory: DocumentObjectFactory,
	component: Document,
	textRegion: calcDocumentTextRegion,
	outline: documentOutline,
	behavior: createFrameBehavior<DocumentState>(),
	stencils: DocumentStencils,
};

export const extractDefinition: ObjectTypeDefinition<ExtractDoc, ExtractState> =
	{
		features: ExtractFeatures,
		mapper: { toDoc: extractToDoc, toState: extractToState },
		stateValidator: isValidExtractState,
		factory: ExtractObjectFactory,
		component: Extract,
		outline: extractOutline,
		behavior: createFrameBehavior<ExtractState>(),
		stencils: ExtractStencils,
	};

export const hexagonDefinition: ObjectTypeDefinition<HexagonDoc, HexagonState> =
	{
		features: HexagonFeatures,
		mapper: { toDoc: hexagonToDoc, toState: hexagonToState },
		stateValidator: isValidHexagonState,
		factory: HexagonObjectFactory,
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
	features: LoopLimitFeatures,
	mapper: { toDoc: loopLimitToDoc, toState: loopLimitToState },
	stateValidator: isValidLoopLimitState,
	factory: LoopLimitObjectFactory,
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
	features: ManualInputFeatures,
	mapper: { toDoc: manualInputToDoc, toState: manualInputToState },
	stateValidator: isValidManualInputState,
	factory: ManualInputObjectFactory,
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
	features: MultiDocumentFeatures,
	mapper: { toDoc: multiDocumentToDoc, toState: multiDocumentToState },
	stateValidator: isValidMultiDocumentState,
	factory: MultiDocumentObjectFactory,
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
	features: OffPageConnectorFeatures,
	mapper: { toDoc: offPageConnectorToDoc, toState: offPageConnectorToState },
	stateValidator: isValidOffPageConnectorState,
	factory: OffPageConnectorObjectFactory,
	component: OffPageConnector,
	textRegion: calcOffPageConnectorTextRegion,
	outline: offPageConnectorOutline,
	behavior: createFrameBehavior<OffPageConnectorState>(),
	stencils: OffPageConnectorStencils,
};

export const parallelogramDefinition: ObjectTypeDefinition<
	ParallelogramDoc,
	ParallelogramState
> = {
	features: ParallelogramFeatures,
	mapper: { toDoc: parallelogramToDoc, toState: parallelogramToState },
	stateValidator: isValidParallelogramState,
	factory: ParallelogramObjectFactory,
	component: Parallelogram,
	textRegion: calcParallelogramTextRegion,
	outline: parallelogramOutline,
	behavior: createFrameBehavior<ParallelogramState>(),
	stencils: ParallelogramStencils,
};

export const stadiumDefinition: ObjectTypeDefinition<StadiumDoc, StadiumState> =
	{
		features: StadiumFeatures,
		mapper: { toDoc: stadiumToDoc, toState: stadiumToState },
		stateValidator: isValidStadiumState,
		factory: StadiumObjectFactory,
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
	features: StoredDataFeatures,
	mapper: { toDoc: storedDataToDoc, toState: storedDataToState },
	stateValidator: isValidStoredDataState,
	factory: StoredDataObjectFactory,
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
	features: SubroutineFeatures,
	mapper: { toDoc: subroutineToDoc, toState: subroutineToState },
	stateValidator: isValidSubroutineState,
	factory: SubroutineObjectFactory,
	component: Subroutine,
	textRegion: calcSubroutineTextRegion,
	behavior: createFrameBehavior<SubroutineState>(),
	stencils: SubroutineStencils,
};

export const trapezoidDefinition: ObjectTypeDefinition<
	TrapezoidDoc,
	TrapezoidState
> = {
	features: TrapezoidFeatures,
	mapper: { toDoc: trapezoidToDoc, toState: trapezoidToState },
	stateValidator: isValidTrapezoidState,
	factory: TrapezoidObjectFactory,
	component: Trapezoid,
	textRegion: calcTrapezoidTextRegion,
	outline: trapezoidOutline,
	behavior: createFrameBehavior<TrapezoidState>(),
	stencils: TrapezoidStencils,
};
