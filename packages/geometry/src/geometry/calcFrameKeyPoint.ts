import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { KeyPointId } from "../types/KeyPoints";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * フレームの key point のうち、指定された1点だけを算出する。
 *
 * 全 8 点が必要なら {@link calcFrameKeyPoints} を使う。1点しか要らない場面
 * （コネクタの endpoint 解決など）で全点計算を避けるための軽量版。
 *
 * @param frame - 変換済みフレーム（中心位置・寸法・回転・スケール）
 * @param keyPointId - 取得したい key point のキー
 * @returns 指定された key point の座標
 */
export const calcFrameKeyPoint = (
	frame: TransformedFrame,
	keyPointId: KeyPointId,
): Point => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// 該当 key point のフレームローカル座標（中心原点）を求める
	let localX: number;
	let localY: number;
	switch (keyPointId) {
		case "topLeft":
			localX = -halfWidth;
			localY = -halfHeight;
			break;
		case "topCenter":
			localX = 0;
			localY = -halfHeight;
			break;
		case "topRight":
			localX = halfWidth;
			localY = -halfHeight;
			break;
		case "rightCenter":
			localX = halfWidth;
			localY = 0;
			break;
		case "bottomRight":
			localX = halfWidth;
			localY = halfHeight;
			break;
		case "bottomCenter":
			localX = 0;
			localY = halfHeight;
			break;
		case "bottomLeft":
			localX = -halfWidth;
			localY = halfHeight;
			break;
		case "leftCenter":
			localX = -halfWidth;
			localY = 0;
			break;
	}

	// calcAffineTransformedPoint は rotation === 0 を内部で最適化する
	const radians = degreesToRadians(rotation);
	return calcAffineTransformedPoint(
		localX,
		localY,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);
};
