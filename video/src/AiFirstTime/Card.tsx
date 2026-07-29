import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Badge2025 } from "./Badge2025";

export const Card: React.FC<{
	appearFrame: number;
	label: string;
}> = ({ appearFrame, label }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const localFrame = frame - appearFrame;

	const scale = spring({
		frame: localFrame,
		fps,
		config: {
			damping: 12,
			stiffness: 160,
			mass: 0.6,
		},
	});

	const opacity = interpolate(localFrame, [0, 8], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<div
			style={{
				width: 220,
				height: 260,
				borderRadius: 16,
				border: "4px solid #f28c28",
				backgroundColor: "#1a1a1a",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: 16,
				transform: `scale(${scale})`,
				opacity,
			}}
		>
			<Badge2025 size={72} />
			<div
				style={{
					fontFamily: "Arial, sans-serif",
					fontWeight: 700,
					fontSize: 26,
					color: "#ffffff",
				}}
			>
				{label}
			</div>
			<div
				style={{
					fontFamily: "Arial, sans-serif",
					fontWeight: 500,
					fontSize: 18,
					color: "#9a9a9a",
				}}
			>
				기억 없음
			</div>
		</div>
	);
};
