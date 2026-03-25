"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { IconDotsVertical } from "@tabler/icons-react";
import { SparklesCore } from "@/src/components/ui/sparkles";
import { cn } from "@/src/lib/utils";

interface CompareProps {
  firstImage?: string;
  secondImage?: string;
  className?: string;
  firstImageClassName?: string;
  secondImageClassname?: string;
  initialSliderPercentage?: number;
  slideMode?: "hover" | "drag";
  showHandlebar?: boolean;
  autoplay?: boolean;
  autoplayDuration?: number;
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export const Compare = ({
  firstImage = "",
  secondImage = "",
  className,
  firstImageClassName,
  secondImageClassname,
  initialSliderPercentage = 50,
  slideMode = "hover",
  showHandlebar = true,
  autoplay = false,
  autoplayDuration = 5000,
}: CompareProps) => {
  const [slider, setSlider] = useState(initialSliderPercentage);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isTouchInteracting, setIsTouchInteracting] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearTimeout(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    if (!autoplay) return;

    stopAutoplay();

    const start = Date.now();

    const loop = () => {
      const elapsed = (Date.now() - start) % (autoplayDuration * 2);
      const progress = elapsed / autoplayDuration;
      const value = progress <= 1 ? progress * 100 : (2 - progress) * 100;

      setSlider(value);
      autoplayRef.current = setTimeout(loop, 16);
    };

    loop();
  }, [autoplay, autoplayDuration, stopAutoplay]);

  useEffect(() => {
    startAutoplay();

    return () => {
      stopAutoplay();

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [startAutoplay, stopAutoplay]);

  const update = useCallback((clientX: number) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    if (rect.width === 0) return;

    const percent = clamp(((clientX - rect.left) / rect.width) * 100);

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      setSlider(percent);
      rafRef.current = null;
    });
  }, []);

  const releasePointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        activePointerIdRef.current !== null &&
        event.currentTarget.hasPointerCapture(activePointerIdRef.current)
      ) {
        event.currentTarget.releasePointerCapture(activePointerIdRef.current);
      }

      activePointerIdRef.current = null;
    },
    []
  );

  const endTouchInteraction = useCallback(
    (resetToInitial: boolean) => {
      setIsTouchInteracting(false);

      if (slideMode === "drag") {
        setIsDragging(false);
      }

      if (slideMode === "hover" && resetToInitial) {
        setSlider(initialSliderPercentage);
      }

      startAutoplay();
    },
    [initialSliderPercentage, slideMode, startAutoplay]
  );

  const onPointerEnter = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse" || slideMode !== "hover") return;

      setIsHovering(true);
      stopAutoplay();
      update(event.clientX);
    },
    [slideMode, stopAutoplay, update]
  );

  const onPointerLeave = useCallback(() => {
    if (slideMode !== "hover" || isTouchInteracting) return;

    setIsHovering(false);
    setSlider(initialSliderPercentage);
    startAutoplay();
  }, [initialSliderPercentage, isTouchInteracting, slideMode, startAutoplay]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const isTouchLike =
        event.pointerType === "touch" || event.pointerType === "pen";

      if (slideMode !== "drag" && !isTouchLike) return;

      activePointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);

      stopAutoplay();
      update(event.clientX);

      if (slideMode === "drag") {
        setIsDragging(true);
      }

      if (isTouchLike) {
        setIsTouchInteracting(true);
      }
    },
    [slideMode, stopAutoplay, update]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const isTouchLike =
        event.pointerType === "touch" || event.pointerType === "pen";

      if (event.pointerType === "mouse" && slideMode === "hover") {
        update(event.clientX);
        return;
      }

      if (isTouchLike && activePointerIdRef.current === event.pointerId) {
        update(event.clientX);
        return;
      }

      if (slideMode === "drag" && isDragging) {
        update(event.clientX);
      }
    },
    [isDragging, slideMode, update]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const isTouchLike =
        event.pointerType === "touch" || event.pointerType === "pen";

      if (isTouchLike && activePointerIdRef.current === event.pointerId) {
        releasePointer(event);
        endTouchInteraction(true);
        return;
      }

      if (slideMode === "drag") {
        releasePointer(event);
        setIsDragging(false);
        startAutoplay();
      }
    },
    [endTouchInteraction, releasePointer, slideMode, startAutoplay]
  );

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const isTouchLike =
        event.pointerType === "touch" || event.pointerType === "pen";

      if (isTouchLike && activePointerIdRef.current === event.pointerId) {
        releasePointer(event);
        endTouchInteraction(true);
        return;
      }

      if (slideMode === "drag") {
        releasePointer(event);
        setIsDragging(false);
        startAutoplay();
      }
    },
    [endTouchInteraction, releasePointer, slideMode, startAutoplay]
  );

  const active = autoplay || isHovering || isDragging || isTouchInteracting;

  return (
    <div
      ref={ref}
      className={cn(
        "relative h-[400px] w-[400px] select-none overflow-hidden",
        className
      )}
      style={{
        cursor:
          slideMode === "drag" ? (isDragging ? "grabbing" : "grab") : "col-resize",
        touchAction: "pan-y",
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <motion.div
        className="absolute inset-y-0 z-30 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-indigo-500 to-transparent"
        style={{ left: `${slider}%` }}
        transition={{ duration: 0 }}
      >
        <div className="absolute left-0 top-1/2 h-full w-36 -translate-y-1/2 bg-gradient-to-r from-indigo-400 to-transparent opacity-50" />
        <div className="absolute right-0 top-1/2 h-full w-36 -translate-y-1/2 bg-gradient-to-l from-indigo-400 to-transparent opacity-50" />

        {active && (
          <div className="absolute left-1/2 top-1/2 h-3/4 w-24 -translate-x-1/2 -translate-y-1/2">
            <SparklesCore
              background="transparent"
              minSize={0.4}
              maxSize={1}
              particleDensity={1200}
              className="h-full w-full"
              particleColor="#FFFFFF"
            />
          </div>
        )}

        {showHandlebar && (
          <div className="absolute left-1/2 top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-white shadow-[0px_-1px_0px_0px_#FFFFFF40]">
            <IconDotsVertical className="h-4 w-4 text-black" />
          </div>
        )}
      </motion.div>

      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <motion.div
          className={cn("absolute inset-0", firstImageClassName)}
          style={{
            clipPath: `inset(0 ${100 - slider}% 0 0)`,
            WebkitClipPath: `inset(0 ${100 - slider}% 0 0)`,
          }}
          transition={{ duration: 0 }}
        >
          <img
            src={firstImage}
            alt="reel reference"
            className={cn("h-full w-full object-cover", firstImageClassName)}
            draggable={false}
          />
        </motion.div>
      </div>

      <img
        src={secondImage}
        alt="real reference"
        className={cn(
          "absolute inset-0 z-[19] h-full w-full object-cover",
          secondImageClassname
        )}
        draggable={false}
      />
    </div>
  );
};
