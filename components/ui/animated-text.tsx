"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimatedTextProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
  duration?: number;
  delay?: number;
  className?: string;
  textClassName?: string;
  underlineClassName?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  underlineGradient?: string;
  underlineHeight?: string;
  underlineOffset?: string;
}

const AnimatedText = React.forwardRef<HTMLDivElement, AnimatedTextProps>(
  (
    {
      text,
      duration = 0.5,
      delay = 0.1,
      className,
      textClassName,
      underlineClassName,
      as: Component = "h1",
      underlineGradient,
      underlineHeight = "h-[3px]",
      underlineOffset = "-bottom-2",
      ...props
    },
    ref
  ) => {
    const letters = Array.from(text);

    const container: Variants = {
      hidden: { opacity: 0 },
      visible: (i: number = 1) => ({
        opacity: 1,
        transition: {
          staggerChildren: duration,
          delayChildren: i * delay,
        },
      }),
    };

    const child: Variants = {
      visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", damping: 12, stiffness: 200 },
      },
      hidden: {
        opacity: 0,
        y: 20,
        transition: { type: "spring", damping: 12, stiffness: 200 },
      },
    };

    const lineVariants: Variants = {
      hidden: { width: "0%", left: "50%" },
      visible: {
        width: "100%",
        left: "0%",
        transition: {
          delay: letters.length * delay,
          duration: 0.8,
          ease: "easeOut",
        },
      },
    };

    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center gap-2", className)}
        {...props}
      >
        <div className="relative">
          <motion.div
            style={{ display: "flex", overflow: "hidden" }}
            variants={container}
            initial="hidden"
            animate="visible"
            className={cn("font-bold text-center", textClassName)}
          >
            {letters.map((letter, index) => (
              <motion.span key={index} variants={child}>
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </motion.div>

          <motion.div
            variants={lineVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              "absolute rounded-full",
              underlineHeight,
              underlineOffset,
              underlineGradient
                ? `bg-gradient-to-r ${underlineGradient}`
                : undefined,
              underlineClassName
            )}
          />
        </div>
      </div>
    );
  }
);

AnimatedText.displayName = "AnimatedText";

export { AnimatedText };
