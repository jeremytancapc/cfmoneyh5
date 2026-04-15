"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface ContainerTextFlipProps {
  /** Array of words/phrases to cycle through in the animation */
  words?: string[];
  /** Time in milliseconds between word transitions */
  interval?: number;
  /** Additional CSS classes to apply to the container */
  className?: string;
  /** Additional CSS classes to apply to the text */
  textClassName?: string;
  /** Duration of the transition animation in milliseconds */
  animationDuration?: number;
  /** Color theme variant */
  variant?: "primary" | "gradient" | "neon" | "glass";
}

export function ContainerTextFlip({
  words = ["revolutionary", "extraordinary", "phenomenal", "incredible"],
  interval = 3500,
  className,
  textClassName,
  animationDuration = 800,
  variant = "gradient",
}: ContainerTextFlipProps) {
  useId();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (words.length <= 1) return;
    const intervalId = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
        setIsAnimating(false);
      }, animationDuration / 2);
    }, interval);

    return () => clearInterval(intervalId);
  }, [words, interval, animationDuration]);

  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return {
          container:
            "text-white shadow-2xl border",
          containerStyle: {
            background: "#0033AA",
            boxShadow: "0 8px 24px -4px rgba(0, 51, 170, 0.20)",
            borderColor: "rgba(0, 51, 170, 0.5)",
          },
          glowBg:
            "linear-gradient(45deg, rgba(0, 51, 170, 0.3), rgba(0, 80, 220, 0.3))",
        };
      case "neon":
        return {
          container:
            "bg-gray-900 text-cyan-400 shadow-2xl shadow-cyan-500/40 border border-cyan-400/60",
          containerStyle: undefined,
          glowBg:
            "linear-gradient(45deg, rgba(6, 182, 212, 0.3), rgba(34, 211, 238, 0.3))",
        };
      case "glass":
        return {
          container:
            "bg-white/10 backdrop-blur-xl text-white shadow-2xl shadow-black/20 border border-white/20",
          containerStyle: undefined,
          glowBg: "linear-gradient(45deg, rgba(255,255,255,0.1))",
        };
      default:
        return {
          container:
            "bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow-2xl shadow-purple-500/40 border border-white/20",
          containerStyle: undefined,
          glowBg:
            "linear-gradient(45deg, rgba(147, 51, 234, 0.3), rgba(219, 39, 119, 0.3), rgba(249, 115, 22, 0.3))",
        };
    }
  };

  const { container, containerStyle, glowBg } = getVariantClasses();

  return (
    <div className="relative isolate w-full flex items-center justify-center">
      {/* Glow — scoped behind the pill via isolate + -z-10 */}
      <motion.div
        animate={{
          scale: isAnimating ? [1, 1.05, 1] : 1,
          opacity: isAnimating ? [0.8, 1, 0.8] : 0.8,
        }}
        transition={{ duration: animationDuration / 1000, ease: "easeInOut" }}
        className="absolute inset-0 -z-10 rounded-2xl blur-lg"
        style={{ background: glowBg }}
      />

      {/* Main pill */}
      <motion.div
        layout
        animate={{ scale: isAnimating ? [1, 0.98, 1] : 1 }}
        transition={{
          duration: animationDuration / 1000,
          ease: "easeInOut",
          layout: { duration: 0.3 },
        }}
        className={cn(
          "relative w-full px-6 py-4 rounded-2xl backdrop-blur-sm",
          "transform-gpu transition-all duration-300",
          container,
          className
        )}
        style={containerStyle}
      >
        {/* Shimmer */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "loop",
              ease: "linear",
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full h-full"
            style={{ transform: "skewX(-20deg)" }}
          />
        </div>

        {/* Text */}
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={words[currentWordIndex]}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)", scale: 0.9 }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)", scale: 1.1 }}
              transition={{
                duration: animationDuration / 1000,
                ease: [0.25, 0.25, 0, 1],
              }}
              className={cn(
                "text-2xl sm:text-3xl md:text-4xl font-black tracking-tight",
                "text-center",
                textClassName
              )}
            >
              {words[currentWordIndex].split("").map((letter, index) => (
                <motion.span
                  key={`${words[currentWordIndex]}-${index}`}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: index * 0.025, duration: 0.4, ease: "easeOut" }}
                  className="inline-block"
                >
                  {letter === " " ? "\u00A0" : letter}
                </motion.span>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Corner accents */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-white/30 rounded-tl-lg" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-white/30 rounded-tr-lg" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-white/30 rounded-bl-lg" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-white/30 rounded-br-lg" />
      </motion.div>
    </div>
  );
}
