import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";

const BlurText = ({
  text = "",
  delay = 200,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = "ease-out",
  onAnimationComplete,
  stepDuration = 0.35
}) => {
  const segments = useMemo(
    () => (animateBy === "words" ? text.split(" ") : Array.from(text)),
    [animateBy, text]
  );
  const ref = useRef(null);
  const spanRefs = useRef([]);
  const [inView, setInView] = useState(false);

  const defaultFrom = useMemo(
    () =>
      direction === "top"
        ? { filter: "blur(10px)", opacity: 0, transform: "translateY(-50px)" }
        : { filter: "blur(10px)", opacity: 0, transform: "translateY(50px)" },
    [direction]
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: "blur(5px)",
        opacity: 0.5,
        transform: direction === "top" ? "translateY(5px)" : "translateY(-5px)"
      },
      { filter: "blur(0px)", opacity: 1, transform: "translateY(0px)" }
    ],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;
  const keyframes = useMemo(
    () => [fromSnapshot, ...toSnapshots],
    [fromSnapshot, toSnapshots]
  );

  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!inView || spanRefs.current.length === 0) return undefined;
    const totalDurationMs = Math.max(0, (toSnapshots.length * stepDuration) * 1000);
    const normalizedEasing = typeof easing === "string" ? easing : "ease-out";
    const animations = [];

    spanRefs.current.forEach((span, index) => {
      if (!span || typeof span.animate !== "function") return;
      const animation = span.animate(keyframes, {
        duration: totalDurationMs,
        delay: index * delay,
        easing: normalizedEasing,
        fill: "forwards"
      });
      animations.push(animation);
      if (index === segments.length - 1 && onAnimationComplete) {
        animation.finished.then(() => onAnimationComplete()).catch(() => {});
      }
    });

    return () => animations.forEach((anim) => anim.cancel());
  }, [delay, easing, inView, keyframes, onAnimationComplete, segments.length, stepDuration, toSnapshots.length]);

  return (
    <Box
      component="p"
      ref={ref}
      className={className}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        m: 0
      }}
    >
      {segments.map((segment, index) => (
        <Box
          component="span"
          key={`${segment}-${index}`}
          ref={(node) => {
            spanRefs.current[index] = node;
          }}
          sx={{
            display: "inline-block",
            willChange: "transform, filter, opacity"
          }}
          style={fromSnapshot}
        >
          {segment === " " ? "\u00A0" : segment}
          {animateBy === "words" && index < segments.length - 1 ? "\u00A0" : ""}
        </Box>
      ))}
    </Box>
  );
};

export default BlurText;
