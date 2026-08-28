import { randomUUID } from "node:crypto";
import { chmod, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

/**
 * ファイルを、書きかけの姿を誰にも見せずに置き換える。
 *
 * 同じディレクトリの一時ファイルへ書いてから rename する。同一ファイルシステム内の
 * rename は不可分なので、読む側からはファイルが古い内容か新しい内容のどちらかにしか
 * 見えない。`writeFile` で直接上書きすると、書いている途中の長さで読まれうる。
 *
 * これは pathLock（src/pathLock.ts）とは守る相手が違う。あちらはツール同士の
 * 割り込みを防ぐもので、ホストのファイル監視や外部のエディタは通らない。こちらは
 * 経路を問わず、読む側すべてに効く。
 *
 * 一時ファイルはドットで始まる名前にして、書き出しに失敗したときは消す。プロセスが
 * 強制終了した場合だけ残るが、その残骸が本物と取り違えられることはない
 * （`.jis.json` で終わらないので、キャンバスとして拾われない）。
 *
 * 置き換え先が既にあれば、そのパーミッションを引き継ぐ。引き継がないと、新しく作った
 * 側の既定モード（umask 由来）になり、元より緩くなりうる。
 *
 * 置き換え先がシンボリックリンクのときは、リンク自体が普通のファイルに置き換わる
 * （直接上書きならリンク先が書き換わる）。`.jis.json` をリンクにする使い方は想定して
 * いないので、解決までは踏み込んでいない。
 *
 * @param filePath 置き換える先。親ディレクトリは存在していること
 * @param contents 書き込む内容
 * @throws 書き込みか置き換えに失敗した理由。そのとき filePath は元のまま
 */
export async function writeFileAtomically(
	filePath: string,
	contents: string | Uint8Array,
): Promise<void> {
	const tempPath = join(
		dirname(filePath),
		`.${basename(filePath)}.${randomUUID()}.tmp`,
	);
	// 置き換え先が無ければ新規作成なので、既定のモードのままでよい
	const previousMode = await stat(filePath)
		.then((stats) => stats.mode)
		.catch(() => null);
	try {
		await writeFile(tempPath, contents);
		if (previousMode !== null) {
			await chmod(tempPath, previousMode);
		}
		await rename(tempPath, filePath);
	} catch (error) {
		await rm(tempPath, { force: true });
		throw error;
	}
}
