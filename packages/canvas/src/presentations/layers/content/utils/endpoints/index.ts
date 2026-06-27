// コネクター端点の解決（アンカー→ワールド座標・輪郭調整）の公開 API。
// resolveEndpoint / adjustToOutline は内部ヘルパなので公開しない。
// React フックは presentations/layers/content/hooks/ に分離した。
export { resolveConnectorPoints } from "./resolveConnectorPoints";
