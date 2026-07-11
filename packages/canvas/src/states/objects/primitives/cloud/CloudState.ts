import type { CloudFeatures } from "../../../../schemas/objects/primitives/cloud/CloudDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CloudStateBrand: unique symbol;

export type CloudState = CreateObjectState<
	typeof CloudFeatures,
	typeof CloudStateBrand
>;
