import type { CreateObjectState } from "@jiscribe/canvas";

import type { DbFeatures } from "../../schema/db/DbDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DbStateBrand: unique symbol;

export type DbState = CreateObjectState<typeof DbFeatures, typeof DbStateBrand>;
