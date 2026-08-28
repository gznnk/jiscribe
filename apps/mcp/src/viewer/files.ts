/**
 * 人が直したキャンバスをワークスペースへ書き戻す。
 *
 * 読み出しの相手方は無い。ビューアが表示する内容は WebSocket で届くので、
 * HTTP でファイルを読む必要がない。
 *
 * @param relPath ワークスペースルートからの相対パス。外へ出るパスはサーバーが拒む
 * @param text 書き込む本文（`.jis.json` の全文）
 * @throws サーバーが返したエラーメッセージを持つ Error
 */
export async function saveFile(relPath: string, text: string): Promise<void> {
	const response = await fetch(
		`/api/file?path=${encodeURIComponent(relPath)}`,
		{ method: "PUT", body: text },
	);
	if (response.ok) {
		return;
	}
	let message = `${response.status} ${response.statusText}`;
	try {
		const body: unknown = await response.json();
		if (
			typeof body === "object" &&
			body !== null &&
			"error" in body &&
			typeof body.error === "string"
		) {
			message = body.error;
		}
	} catch {
		// JSON でないエラーボディはステータス行のまま伝える
	}
	throw new Error(message);
}
