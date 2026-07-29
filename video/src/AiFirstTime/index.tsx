import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Card } from "./Card";

const CARD_APPEAR_FRAMES = [20, 60, 100];

export const AiFirstTime: React.FC = () => {
	const frame = useCurrentFrame();

	const titleOpacity = interpolate(frame, [0, 10], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill style={{ backgroundColor: "#000000" }}>
			<div
				style={{
					position: "absolute",
					top: 48,
					left: 0,
					right: 0,
					textAlign: "center",
					fontFamily: "Arial, sans-serif",
					fontWeight: 700,
					fontSize: 40,
					color: "#8a8a8a",
					opacity: titleOpacity,
				}}
			>
				AI는 매번 처음이다
			</div>

			<AbsoluteFill
				style={{
					alignItems: "center",
					justifyContent: "center",
					flexDirection: "row",
					gap: 40,
				}}
			>
				{CARD_APPEAR_FRAMES.map((appearFrame, i) => (
					<Card key={i} appearFrame={appearFrame} label={`화면 ${i + 1}`} />
				))}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
