import { DB_DOC_DEFAULTS } from "./DbDoc";
import { createFrameObjectFactory } from "../../utils/createFrameObjectFactory";

/** Factory for creating Db shapes (Frame-family shared logic generated from defaults). */
export const DbObjectFactory = createFrameObjectFactory(DB_DOC_DEFAULTS);
