import type { HexagonFeatures } from "../../../../schemas/objects/flowchart/hexagon/HexagonDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const HexagonStateBrand: unique symbol;

export type HexagonState = CreateObjectState<
	typeof HexagonFeatures,
	typeof HexagonStateBrand
>;
