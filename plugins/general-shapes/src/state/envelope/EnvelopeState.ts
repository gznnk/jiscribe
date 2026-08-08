import type { CreateObjectState } from "@workspace/canvas";

import type { EnvelopeFeatures } from "../../schema/envelope/EnvelopeDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const EnvelopeStateBrand: unique symbol;

export type EnvelopeState = CreateObjectState<
	typeof EnvelopeFeatures,
	typeof EnvelopeStateBrand
>;
