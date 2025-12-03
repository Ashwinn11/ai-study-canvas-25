'use client';

import { useLottie } from "lottie-react";
import type { LottieRefCurrentProps } from "lottie-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface LottieAnimationProps {
  animationData: unknown;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

export const LottieAnimation = ({
  animationData,
  className,
  loop = true,
  autoplay = true,
}: LottieAnimationProps) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const options = {
    animationData,
    loop,
    autoplay,
  };

  const { View } = useLottie(options);

  return (
    <div className={cn("w-full h-full", className)}>
      {View}
    </div>
  );
};
