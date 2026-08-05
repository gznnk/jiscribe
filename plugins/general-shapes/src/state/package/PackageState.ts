import type { CreateObjectState } from "@workspace/canvas";

import type { PackageFeatures } from "../../schema/package/PackageDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PackageStateBrand: unique symbol;

export type PackageState = CreateObjectState<
	typeof PackageFeatures,
	typeof PackageStateBrand
>;
