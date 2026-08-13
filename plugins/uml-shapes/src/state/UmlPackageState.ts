import type { CreateObjectState } from "@jiscribe/canvas";

import type { UmlPackageFeatures } from "../schema/UmlPackageDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const UmlPackageStateBrand: unique symbol;

export type UmlPackageState = CreateObjectState<
	typeof UmlPackageFeatures,
	typeof UmlPackageStateBrand
>;
