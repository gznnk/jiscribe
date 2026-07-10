import { DB_DOC_DEFAULTS } from "./DbDoc";
import { createFrameShapeFactory } from "../../utils/createFrameShapeFactory";

/** Factory for creating Db shapes (Frame-family shared logic generated from defaults). */
export const DbShapeFactory = createFrameShapeFactory(DB_DOC_DEFAULTS);
