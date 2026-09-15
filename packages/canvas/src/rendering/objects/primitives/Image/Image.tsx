import type React from "react";
import { memo } from "react";

import {
	IMAGE_PLACEHOLDER_MARK_HEIGHT,
	IMAGE_PLACEHOLDER_MARK_PATH,
	IMAGE_PLACEHOLDER_MARK_WIDTH,
} from "./ImageConstants";
import {
	ImageContent,
	ImageHitRect,
	ImagePlaceholderMark,
	ImagePlaceholderRect,
} from "./ImageStyled";
import type { ImageState } from "../../../../states/objects/primitives/image/ImageState";
import { useResolvedImagesContext } from "../../ResolvedImagesContext";
import { createSvgTransform } from "../../utils/createSvgTransform";

type ImageProps = ImageState;

const ImageComponent: React.FC<ImageProps> = ({
	id,
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	src,
}) => {
	const resolved = useResolvedImagesContext()(src);
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	return (
		<g transform={transformAttr} data-image-status={resolved.status}>
			{resolved.status === "ready" ? (
				<ImageContent
					// The export reads the src off here to swap the blob URL for the
					// bytes themselves (see buildExportSvg).
					data-image-src={src}
					href={resolved.objectUrl}
					x={-width / 2}
					y={-height / 2}
					width={width}
					height={height}
					preserveAspectRatio="none"
				/>
			) : (
				<>
					<ImagePlaceholderRect
						x={-width / 2}
						y={-height / 2}
						width={width}
						height={height}
					/>
					{width >= IMAGE_PLACEHOLDER_MARK_WIDTH &&
						height >= IMAGE_PLACEHOLDER_MARK_HEIGHT && (
							<ImagePlaceholderMark d={IMAGE_PLACEHOLDER_MARK_PATH} />
						)}
				</>
			)}
			<ImageHitRect
				data-kind="object"
				data-id={id}
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				tabIndex={0}
			/>
		</g>
	);
};

/**
 * Renders an image object: the file the host resolved, stretched to fill the
 * box, or a placeholder while it is being fetched and after a failure — the
 * canvas draws something either way, since the box is in the document even when
 * the bytes cannot be had.
 */
export const Image = memo(ImageComponent);
