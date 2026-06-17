/**
 * Control の targetId から編集中のエンドポイントを取得する。
 * "connection-anchor:edit:connectorId:source" -> "source"
 * "connection-anchor:edit:connectorId:target" -> "target"
 * 新規作成（"connection-anchor:create:..."）やフォーマット不一致は "target"（デフォルト）。
 */
export function getEditingEndpoint(
	targetId: string | undefined,
): "source" | "target" {
	if (!targetId) {
		return "target";
	}

	const parts = targetId.split(":");
	// Format: "connection-anchor:edit:connectorId:endpoint"
	if (parts.length === 4 && parts[1] === "edit") {
		const endpoint = parts[3];
		if (endpoint === "source" || endpoint === "target") {
			return endpoint;
		}
	}

	// Default to "target" for creation mode
	return "target";
}
