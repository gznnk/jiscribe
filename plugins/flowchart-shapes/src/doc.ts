// Headless (UI 非依存) 入口。canvas 本体の ./doc と相似形: MCP や VSCode 拡張の
// Node 側診断など、definitions.ts（React コンポーネントを含む）を経由せずに parse-time
// 検証へ参加したい消費者のための入口。import は ./schema/** と @workspace/canvas/doc /
// @workspace/canvas/unstable-doc のみで、presentation / state / stencil を引き込まない。
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@workspace/canvas/doc";

import { CardFeatures } from "./schema/card/CardDoc";
import { CardObjectFactory } from "./schema/card/CardObjectFactory";
import { validateCardDoc } from "./schema/card/validateCardDoc";
import { CrossFeatures } from "./schema/cross/CrossDoc";
import { CrossObjectFactory } from "./schema/cross/CrossObjectFactory";
import { validateCrossDoc } from "./schema/cross/validateCrossDoc";
import { DbFeatures } from "./schema/db/DbDoc";
import { DbObjectFactory } from "./schema/db/DbObjectFactory";
import { validateDbDoc } from "./schema/db/validateDbDoc";
import { DelayFeatures } from "./schema/delay/DelayDoc";
import { DelayObjectFactory } from "./schema/delay/DelayObjectFactory";
import { validateDelayDoc } from "./schema/delay/validateDelayDoc";
import { DiamondFeatures } from "./schema/diamond/DiamondDoc";
import { DiamondObjectFactory } from "./schema/diamond/DiamondObjectFactory";
import { validateDiamondDoc } from "./schema/diamond/validateDiamondDoc";
import { DisplayFeatures } from "./schema/display/DisplayDoc";
import { DisplayObjectFactory } from "./schema/display/DisplayObjectFactory";
import { validateDisplayDoc } from "./schema/display/validateDisplayDoc";
import { DocumentFeatures } from "./schema/document/DocumentDoc";
import { DocumentObjectFactory } from "./schema/document/DocumentObjectFactory";
import { validateDocumentDoc } from "./schema/document/validateDocumentDoc";
import { ExtractFeatures } from "./schema/extract/ExtractDoc";
import { ExtractObjectFactory } from "./schema/extract/ExtractObjectFactory";
import { validateExtractDoc } from "./schema/extract/validateExtractDoc";
import { HexagonFeatures } from "./schema/hexagon/HexagonDoc";
import { HexagonObjectFactory } from "./schema/hexagon/HexagonObjectFactory";
import { validateHexagonDoc } from "./schema/hexagon/validateHexagonDoc";
import { LoopLimitFeatures } from "./schema/loopLimit/LoopLimitDoc";
import { LoopLimitObjectFactory } from "./schema/loopLimit/LoopLimitObjectFactory";
import { validateLoopLimitDoc } from "./schema/loopLimit/validateLoopLimitDoc";
import { ManualInputFeatures } from "./schema/manualInput/ManualInputDoc";
import { ManualInputObjectFactory } from "./schema/manualInput/ManualInputObjectFactory";
import { validateManualInputDoc } from "./schema/manualInput/validateManualInputDoc";
import { MultiDocumentFeatures } from "./schema/multiDocument/MultiDocumentDoc";
import { MultiDocumentObjectFactory } from "./schema/multiDocument/MultiDocumentObjectFactory";
import { validateMultiDocumentDoc } from "./schema/multiDocument/validateMultiDocumentDoc";
import { OffPageConnectorFeatures } from "./schema/offPageConnector/OffPageConnectorDoc";
import { OffPageConnectorObjectFactory } from "./schema/offPageConnector/OffPageConnectorObjectFactory";
import { validateOffPageConnectorDoc } from "./schema/offPageConnector/validateOffPageConnectorDoc";
import { ParallelogramFeatures } from "./schema/parallelogram/ParallelogramDoc";
import { ParallelogramObjectFactory } from "./schema/parallelogram/ParallelogramObjectFactory";
import { validateParallelogramDoc } from "./schema/parallelogram/validateParallelogramDoc";
import { StadiumFeatures } from "./schema/stadium/StadiumDoc";
import { StadiumObjectFactory } from "./schema/stadium/StadiumObjectFactory";
import { validateStadiumDoc } from "./schema/stadium/validateStadiumDoc";
import { StoredDataFeatures } from "./schema/storedData/StoredDataDoc";
import { StoredDataObjectFactory } from "./schema/storedData/StoredDataObjectFactory";
import { validateStoredDataDoc } from "./schema/storedData/validateStoredDataDoc";
import { SubroutineFeatures } from "./schema/subroutine/SubroutineDoc";
import { SubroutineObjectFactory } from "./schema/subroutine/SubroutineObjectFactory";
import { validateSubroutineDoc } from "./schema/subroutine/validateSubroutineDoc";
import { TrapezoidFeatures } from "./schema/trapezoid/TrapezoidDoc";
import { TrapezoidObjectFactory } from "./schema/trapezoid/TrapezoidObjectFactory";
import { validateTrapezoidDoc } from "./schema/trapezoid/validateTrapezoidDoc";

export const cardDocDefinition: ObjectDocDefinition = {
	features: CardFeatures,
	validateDoc: validateCardDoc,
	factory: CardObjectFactory,
};

export const crossDocDefinition: ObjectDocDefinition = {
	features: CrossFeatures,
	validateDoc: validateCrossDoc,
	factory: CrossObjectFactory,
};

export const dbDocDefinition: ObjectDocDefinition = {
	features: DbFeatures,
	validateDoc: validateDbDoc,
	factory: DbObjectFactory,
};

export const delayDocDefinition: ObjectDocDefinition = {
	features: DelayFeatures,
	validateDoc: validateDelayDoc,
	factory: DelayObjectFactory,
};

export const diamondDocDefinition: ObjectDocDefinition = {
	features: DiamondFeatures,
	validateDoc: validateDiamondDoc,
	factory: DiamondObjectFactory,
};

export const displayDocDefinition: ObjectDocDefinition = {
	features: DisplayFeatures,
	validateDoc: validateDisplayDoc,
	factory: DisplayObjectFactory,
};

export const documentDocDefinition: ObjectDocDefinition = {
	features: DocumentFeatures,
	validateDoc: validateDocumentDoc,
	factory: DocumentObjectFactory,
};

export const extractDocDefinition: ObjectDocDefinition = {
	features: ExtractFeatures,
	validateDoc: validateExtractDoc,
	factory: ExtractObjectFactory,
};

export const hexagonDocDefinition: ObjectDocDefinition = {
	features: HexagonFeatures,
	validateDoc: validateHexagonDoc,
	factory: HexagonObjectFactory,
};

export const loopLimitDocDefinition: ObjectDocDefinition = {
	features: LoopLimitFeatures,
	validateDoc: validateLoopLimitDoc,
	factory: LoopLimitObjectFactory,
};

export const manualInputDocDefinition: ObjectDocDefinition = {
	features: ManualInputFeatures,
	validateDoc: validateManualInputDoc,
	factory: ManualInputObjectFactory,
};

export const multiDocumentDocDefinition: ObjectDocDefinition = {
	features: MultiDocumentFeatures,
	validateDoc: validateMultiDocumentDoc,
	factory: MultiDocumentObjectFactory,
};

export const offPageConnectorDocDefinition: ObjectDocDefinition = {
	features: OffPageConnectorFeatures,
	validateDoc: validateOffPageConnectorDoc,
	factory: OffPageConnectorObjectFactory,
};

export const parallelogramDocDefinition: ObjectDocDefinition = {
	features: ParallelogramFeatures,
	validateDoc: validateParallelogramDoc,
	factory: ParallelogramObjectFactory,
};

export const stadiumDocDefinition: ObjectDocDefinition = {
	features: StadiumFeatures,
	validateDoc: validateStadiumDoc,
	factory: StadiumObjectFactory,
};

export const storedDataDocDefinition: ObjectDocDefinition = {
	features: StoredDataFeatures,
	validateDoc: validateStoredDataDoc,
	factory: StoredDataObjectFactory,
};

export const subroutineDocDefinition: ObjectDocDefinition = {
	features: SubroutineFeatures,
	validateDoc: validateSubroutineDoc,
	factory: SubroutineObjectFactory,
};

export const trapezoidDocDefinition: ObjectDocDefinition = {
	features: TrapezoidFeatures,
	validateDoc: validateTrapezoidDoc,
	factory: TrapezoidObjectFactory,
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
