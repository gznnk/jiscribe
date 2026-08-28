import path from "node:path";

/** ワークスペース外へのアクセス要求を表すエラー。HTTP 層では 400 に写す */
export class WorkspacePathError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "WorkspacePathError";
	}
}

/** win32 はパスの大文字小文字を区別しないため、境界判定も同じ規則で行う */
const normalizeForComparison = (value: string): string =>
	process.platform === "win32" ? value.toLowerCase() : value;

/**
 * ワークスペース相対パスを絶対パスに解決する。ワークスペース外へ出る
 * 入力（絶対パス・`..` による脱出・ドライブ相対パス）は WorkspacePathError で拒否する。
 *
 * ブラウザから届くパスをそのまま結合するわけにいかないため、書き込み・配信の
 * どちらもここを通す。
 *
 * @param workspaceRoot ワークスペースのルート（絶対パス）
 * @param relPath ワークスペースルートからの相対パス。空文字はルート自身を指す
 * @returns 解決済みの絶対パス。`relPath` が空ならルートそのもの
 */
export function resolveWorkspacePath(
	workspaceRoot: string,
	relPath: string,
): string {
	if (path.isAbsolute(relPath) || /^[a-zA-Z]:/.test(relPath)) {
		throw new WorkspacePathError(`absolute path is not allowed: ${relPath}`);
	}
	const resolvedRoot = path.resolve(workspaceRoot);
	const resolvedTarget = path.resolve(resolvedRoot, relPath);

	const comparableRoot = normalizeForComparison(resolvedRoot);
	const comparableTarget = normalizeForComparison(resolvedTarget);
	if (comparableTarget === comparableRoot) {
		return resolvedTarget;
	}
	// "/work" と "/work2" のような前方一致の別ディレクトリを弾くため、
	// 必ずセパレータ境界付きで比較する
	if (!comparableTarget.startsWith(comparableRoot + path.sep)) {
		throw new WorkspacePathError(`path escapes workspace: ${relPath}`);
	}
	return resolvedTarget;
}
