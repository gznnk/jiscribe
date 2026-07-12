import type { TriangleFeatures } from "../../../../schemas/objects/primitives/triangle/TriangleDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TriangleStateBrand: unique symbol;

export type TriangleState = CreateObjectState<
	typeof TriangleFeatures,
	typeof TriangleStateBrand
>;
