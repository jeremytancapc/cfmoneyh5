"use client";

import React, { useId } from "react";

interface TextAnimationProps {
  text: string;
  /** CSS font-size value, e.g. "4rem" or "clamp(2.5rem, 8vw, 4rem)" */
  fontSize?: string;
  color?: string;
  /** Optional glow color — defaults to same as color */
  glowColor?: string;
  animationDuration?: string;
  className?: string;
}

export function TextAnimation({
  text,
  fontSize = "clamp(2.5rem, 8vw, 3.75rem)",
  color = "#0033AA",
  glowColor,
  animationDuration = "900ms",
  className,
}: TextAnimationProps) {
  const id = useId().replace(/:/g, "");
  const enterName = `layerize_enter_${id}`;
  const idleName = `layerize_idle_${id}`;

  const step = "0.033333em";
  const layers = 4;
  const alphas = ["40", "33", "26", "1A"];
  const shadowColors = alphas.map((a) => `${color}${a}`);

  const shadowFull = shadowColors
    .map((c, i) => `calc(${step} * ${i + 1}) calc(${step} * ${i + 1}) ${c}`)
    .join(", ");

  const alphasLow = ["08", "06", "04", "02"];
  const shadowLow = alphasLow
    .map((a, i) => `calc(${step} * ${i + 1}) calc(${step} * ${i + 1}) ${color}${a}`)
    .join(", ");

  const shadowNone = shadowColors.map(() => "0 0 transparent").join(", ");
  const translateEnd = `calc(${step} * ${layers} / -2)`;

  const filterFull = glowColor
    ? `drop-shadow(0 0 10px ${glowColor}99) drop-shadow(0 0 22px ${glowColor}55)`
    : "none";
  const filterLow  = glowColor
    ? `drop-shadow(0 0  3px ${glowColor}33)`
    : "none";

  return (
    <>
      <style>{`
        @keyframes ${enterName} {
          0% {
            opacity: 0;
            transform: translate(0, 0);
            text-shadow: ${shadowNone};
            filter: none;
          }
          100% {
            opacity: 1;
            transform: translate(${translateEnd}, ${translateEnd});
            text-shadow: ${shadowFull};
            filter: ${filterFull};
          }
        }
        @keyframes ${idleName} {
          0%   { text-shadow: ${shadowFull}; filter: ${filterFull}; }
          100% { text-shadow: ${shadowLow};  filter: ${filterLow};  }
        }
      `}</style>

      <div
        className={className}
        style={{
          animation: [
            `${enterName} cubic-bezier(0.4, 0.0, 0.2, 1) ${animationDuration} 100ms both`,
            `${idleName} ease-in-out 1.8s ${animationDuration} infinite alternate`,
          ].join(", "),
          transform: `translate(${translateEnd}, ${translateEnd})`,
          color,
          fontSize,
          fontWeight: 900,
          fontStyle: "italic",
          letterSpacing: "-0.04em",
          textAlign: "center",
          userSelect: "none",
          cursor: "default",
          textRendering: "optimizeLegibility",
          lineHeight: 1.1,
          fontFamily: "var(--font-display, inherit)",
        }}
      >
        {text}
      </div>
    </>
  );
}
