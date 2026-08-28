import { resolve } from "node:path";

/** win32 はパスの大文字小文字を区別しないので、鍵も同じ規則で作る */
const toLockKey = (filePath: string): string => {
	const resolvedPath = resolve(filePath);
	return process.platform === "win32"
		? resolvedPath.toLowerCase()
		: resolvedPath;
};

/**
 * 1 ファイルぶんの処理を、そのファイルの先行分が終わってから走らせる関門。
 *
 * @param filePath 対象ファイル（絶対パスでなくてもよい。解決してから鍵にする）
 * @param task 走らせる処理。先行分が失敗していても実行される
 */
export type PathLock = <T>(
	filePath: string,
	task: () => Promise<T>,
) => Promise<T>;

/**
 * 同じファイルへの手を 1 つずつ流す関門を作る。
 *
 * ツールはどれも「読み込み → 変更 → 書き戻し」でファイルを更新するので、その間に
 * 別の手が割り込むと、後の書き戻しが先の変更ごと捨てる。AI は独立した追加をまとめて
 * 投げてくるため、これは稀な競合ではなく既定の経路になる。
 *
 * 直列化はパス単位なので、別々のファイルへの手は互いを待たない。
 *
 * @returns パスごとに直列化して task を走らせる関数
 */
export function createPathLock(): PathLock {
	// パスごとの「最後に並んだ手」。終わったら消す（触ったファイルのぶん育たないように）
	const tailByKey = new Map<string, Promise<void>>();

	return async <T>(filePath: string, task: () => Promise<T>): Promise<T> => {
		const key = toLockKey(filePath);
		const previous = tailByKey.get(key) ?? Promise.resolve();
		// 先行分の成否は問わない。鎖を切らさないために待つだけ
		const started = previous.then(task, task);
		const settled = started.then(
			() => undefined,
			() => undefined,
		);
		tailByKey.set(key, settled);
		try {
			return await started;
		} finally {
			// 自分が最後尾のままなら、この鍵はもう要らない
			if (tailByKey.get(key) === settled) {
				tailByKey.delete(key);
			}
		}
	};
}
