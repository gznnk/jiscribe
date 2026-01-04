import type { Prettify } from "../../../../../utility-types/src";
import type { PolylineDoc } from "../primitives/PolylineDoc";

export type ConnectorDoc = Prettify<PolylineDoc & { type: "connector" }>;
