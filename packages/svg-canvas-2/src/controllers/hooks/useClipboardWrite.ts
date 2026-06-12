import { useEffect, useState } from "react";

import type { ClipboardData } from "../commands/selection/ClipboardData";

/**
 * internalClipboard の変更（Copy / Cut）を OS クリップボードへ書き込むカスタムフック
 *
 * 副作用を Command.execute の外に置くことで、コマンドの純粋関数契約を維持する。
 *
 * @param internalClipboard - Canvas 内部クリップボードの現在値
 * @returns 書き込み失敗のたびにインクリメントされるエラーバージョン
 */
export const useClipboardWrite = (
	internalClipboard: ClipboardData | null,
): number => {
	const [clipboardWriteErrorVersion, setClipboardWriteErrorVersion] =
		useState(0);

	useEffect(() => {
		if (!internalClipboard) {
			return;
		}
		navigator.clipboard
			.writeText(JSON.stringify(internalClipboard))
			.catch(() => {
				setClipboardWriteErrorVersion((v) => v + 1);
			});
	}, [internalClipboard]);

	return clipboardWriteErrorVersion;
};
