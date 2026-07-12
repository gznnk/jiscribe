import type { DbFeatures } from "../../../../schemas/objects/primitives/db/DbDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DbStateBrand: unique symbol;

export type DbState = CreateObjectState<typeof DbFeatures, typeof DbStateBrand>;
