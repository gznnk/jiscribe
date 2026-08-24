import type { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";

import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RectStateBrand: unique symbol;

export type RectState = CreateObjectState<
	typeof RectFeatures,
	typeof RectStateBrand
>;
