// コネクター端点の解決（アンカー→ワールド座標・輪郭調整）の公開 API。
// resolveEndpoint / adjustToOutline は内部ヘルパなので公開しない。
export { resolveConnectorPoints } from "./resolveConnectorPoints";
export {
	useResolvedConnectorPoints,
	type ResolvedConnectorPoints,
} from "./useResolvedConnectorPoints";
