"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";
import searchAnimationData from "@/lib/animations/search-lottie.json";

export interface SearchLottieIconProps {
  className?: string;
  size?: number | string;
  isHovered?: boolean;
  isOpen?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  onClick?: () => void;
}

export function SearchLottieIcon({
  className = "size-4",
  size,
  isHovered,
  isOpen,
  loop = false,
  autoplay = false,
  onClick,
}: SearchLottieIconProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let anim: AnimationItem | null = null;
    let isMounted = true;

    async function loadLottie() {
      if (!containerRef.current) return;
      try {
        const lottieModule = await import("lottie-web");
        const lottie = lottieModule.default || lottieModule;
        if (!isMounted || !containerRef.current) return;

        if (animRef.current) {
          animRef.current.destroy();
        }

        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: loop,
          autoplay: autoplay,
          animationData: searchAnimationData,
        });

        animRef.current = anim;
        setIsLoaded(true);

        if (!autoplay) {
          anim.goToAndStop(0, true);
        }
      } catch (err) {
        console.error("Failed to load Lottie search animation:", err);
      }
    }

    void loadLottie();

    return () => {
      isMounted = false;
      if (anim) {
        anim.destroy();
      }
    };
  }, [loop, autoplay]);

  // Respond to hover state from props
  useEffect(() => {
    if (!animRef.current || !isLoaded) return;
    if (isHovered) {
      animRef.current.setLoop(true);
      animRef.current.setDirection(1);
      animRef.current.play();
    } else if (!loop && !isOpen) {
      animRef.current.setLoop(false);
      animRef.current.goToAndStop(0, true);
    }
  }, [isHovered, isLoaded, loop, isOpen]);

  // Respond to modal open/close state
  useEffect(() => {
    if (!animRef.current || !isLoaded) return;
    if (isOpen) {
      animRef.current.setLoop(false);
      animRef.current.setDirection(1);
      animRef.current.play();
    } else if (!isHovered && !loop) {
      animRef.current.goToAndStop(0, true);
    }
  }, [isOpen, isLoaded, isHovered, loop]);

  const handleMouseEnter = () => {
    if (animRef.current && isLoaded) {
      animRef.current.setLoop(true);
      animRef.current.setDirection(1);
      animRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (animRef.current && isLoaded && !loop && !isOpen) {
      animRef.current.setLoop(false);
      animRef.current.goToAndStop(0, true);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`inline-flex items-center justify-center shrink-0 leading-none overflow-hidden [&_svg]:size-full [&_svg]:overflow-visible [&_path]:!stroke-current [&_path]:!fill-none ${className}`}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    />
  );
}
