import type { EllipseFeatures } from "../../../../schemas/objects/primitives/ellipse/EllipseDoc";
import type { CreateObjectState } from "../../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const EllipseStateBrand: unique symbol;

export type EllipseState = CreateObjectState<
	typeof EllipseFeatures,
	typeof EllipseStateBrand
>;
