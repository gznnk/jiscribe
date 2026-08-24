import type { EllipseFeatures } from "@jiscribe/doc/model/objects/primitives/ellipse/EllipseDoc";

import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const EllipseStateBrand: unique symbol;

export type EllipseState = CreateObjectState<
	typeof EllipseFeatures,
	typeof EllipseStateBrand
>;
