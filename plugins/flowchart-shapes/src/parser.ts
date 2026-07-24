// Parser-only entry point (UI 非依存)。canvas 本体の ./parser と相似形: MCP や VSCode
// 拡張の Node 側診断など、definitions.ts（React コンポーネントを含む）を経由せずに
// parse-time 検証へ参加したい消費者のための入口。
import type { ObjectParserExtension } from "@workspace/canvas/parser";

import { CardFeatures } from "./schema/card/CardDoc";
import { validateCardDoc } from "./schema/card/validateCardDoc";
import { CrossFeatures } from "./schema/cross/CrossDoc";
import { validateCrossDoc } from "./schema/cross/validateCrossDoc";
import { DbFeatures } from "./schema/db/DbDoc";
import { validateDbDoc } from "./schema/db/validateDbDoc";
import { DelayFeatures } from "./schema/delay/DelayDoc";
import { validateDelayDoc } from "./schema/delay/validateDelayDoc";
import { DiamondFeatures } from "./schema/diamond/DiamondDoc";
import { validateDiamondDoc } from "./schema/diamond/validateDiamondDoc";
import { DisplayFeatures } from "./schema/display/DisplayDoc";
import { validateDisplayDoc } from "./schema/display/validateDisplayDoc";
import { DocumentFeatures } from "./schema/document/DocumentDoc";
import { validateDocumentDoc } from "./schema/document/validateDocumentDoc";
import { ExtractFeatures } from "./schema/extract/ExtractDoc";
import { validateExtractDoc } from "./schema/extract/validateExtractDoc";
import { HexagonFeatures } from "./schema/hexagon/HexagonDoc";
import { validateHexagonDoc } from "./schema/hexagon/validateHexagonDoc";
import { LoopLimitFeatures } from "./schema/loopLimit/LoopLimitDoc";
import { validateLoopLimitDoc } from "./schema/loopLimit/validateLoopLimitDoc";
import { ManualInputFeatures } from "./schema/manualInput/ManualInputDoc";
import { validateManualInputDoc } from "./schema/manualInput/validateManualInputDoc";
import { MultiDocumentFeatures } from "./schema/multiDocument/MultiDocumentDoc";
import { validateMultiDocumentDoc } from "./schema/multiDocument/validateMultiDocumentDoc";
import { OffPageConnectorFeatures } from "./schema/offPageConnector/OffPageConnectorDoc";
import { validateOffPageConnectorDoc } from "./schema/offPageConnector/validateOffPageConnectorDoc";
import { ParallelogramFeatures } from "./schema/parallelogram/ParallelogramDoc";
import { validateParallelogramDoc } from "./schema/parallelogram/validateParallelogramDoc";
import { StadiumFeatures } from "./schema/stadium/StadiumDoc";
import { validateStadiumDoc } from "./schema/stadium/validateStadiumDoc";
import { StoredDataFeatures } from "./schema/storedData/StoredDataDoc";
import { validateStoredDataDoc } from "./schema/storedData/validateStoredDataDoc";
import { SubroutineFeatures } from "./schema/subroutine/SubroutineDoc";
import { validateSubroutineDoc } from "./schema/subroutine/validateSubroutineDoc";
import { TrapezoidFeatures } from "./schema/trapezoid/TrapezoidDoc";
import { validateTrapezoidDoc } from "./schema/trapezoid/validateTrapezoidDoc";

export const flowchartParserExtensions: readonly ObjectParserExtension[] = [
	{
		type: "card",
		features: CardFeatures,
		validateDoc: validateCardDoc,
	},
	{
		type: "cross",
		features: CrossFeatures,
		validateDoc: validateCrossDoc,
	},
	{
		type: "db",
		features: DbFeatures,
		validateDoc: validateDbDoc,
	},
	{
		type: "delay",
		features: DelayFeatures,
		validateDoc: validateDelayDoc,
	},
	{
		type: "diamond",
		features: DiamondFeatures,
		validateDoc: validateDiamondDoc,
	},
	{
		type: "display",
		features: DisplayFeatures,
		validateDoc: validateDisplayDoc,
	},
	{
		type: "document",
		features: DocumentFeatures,
		validateDoc: validateDocumentDoc,
	},
	{
		type: "extract",
		features: ExtractFeatures,
		validateDoc: validateExtractDoc,
	},
	{
		type: "hexagon",
		features: HexagonFeatures,
		validateDoc: validateHexagonDoc,
	},
	{
		type: "loopLimit",
		features: LoopLimitFeatures,
		validateDoc: validateLoopLimitDoc,
	},
	{
		type: "manualInput",
		features: ManualInputFeatures,
		validateDoc: validateManualInputDoc,
	},
	{
		type: "multiDocument",
		features: MultiDocumentFeatures,
		validateDoc: validateMultiDocumentDoc,
	},
	{
		type: "offPageConnector",
		features: OffPageConnectorFeatures,
		validateDoc: validateOffPageConnectorDoc,
	},
	{
		type: "parallelogram",
		features: ParallelogramFeatures,
		validateDoc: validateParallelogramDoc,
	},
	{
		type: "stadium",
		features: StadiumFeatures,
		validateDoc: validateStadiumDoc,
	},
	{
		type: "storedData",
		features: StoredDataFeatures,
		validateDoc: validateStoredDataDoc,
	},
	{
		type: "subroutine",
		features: SubroutineFeatures,
		validateDoc: validateSubroutineDoc,
	},
	{
		type: "trapezoid",
		features: TrapezoidFeatures,
		validateDoc: validateTrapezoidDoc,
	},
];
