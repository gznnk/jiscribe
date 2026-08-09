import type { CreateObjectState } from "@jiscribe/canvas";

import type { HexagonFeatures } from "../../schema/hexagon/HexagonDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const HexagonStateBrand: unique symbol;

export type HexagonState = CreateObjectState<
	typeof HexagonFeatures,
	typeof HexagonStateBrand
>;
