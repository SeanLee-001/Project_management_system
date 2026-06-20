"use client";

import { useState, useEffect } from "react";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

interface ResponsiveState {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  orientation: "portrait" | "landscape";
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2xl: boolean;
  up: (bp: Breakpoint) => boolean;
  down: (bp: Breakpoint) => boolean;
  between: (min: Breakpoint, max: Breakpoint) => boolean;
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS["2xl"]) return "2xl";
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "xs";
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<{
    width: number;
    height: number;
    breakpoint: Breakpoint;
    isTouchDevice: boolean;
    orientation: "portrait" | "landscape";
  }>(() => {
    if (typeof window === "undefined") {
      return {
        width: 1024,
        height: 768,
        breakpoint: "lg",
        isTouchDevice: false,
        orientation: "landscape",
      };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      breakpoint: getBreakpoint(window.innerWidth),
      isTouchDevice: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      orientation: window.innerWidth > window.innerHeight ? "landscape" : "portrait",
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number;
    let prevWidth = window.innerWidth;
    let prevHeight = window.innerHeight;

    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (w === prevWidth && h === prevHeight) return;
        prevWidth = w;
        prevHeight = h;
        setState({
          width: w,
          height: h,
          breakpoint: getBreakpoint(w),
          isTouchDevice: "ontouchstart" in window || navigator.maxTouchPoints > 0,
          orientation: w > h ? "landscape" : "portrait",
        });
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  const { width, height, breakpoint, isTouchDevice, orientation } = state;

  const up = (bp: Breakpoint) => width >= BREAKPOINTS[bp];
  const down = (bp: Breakpoint) => width < BREAKPOINTS[bp];
  const between = (min: Breakpoint, max: Breakpoint) =>
    width >= BREAKPOINTS[min] && width < BREAKPOINTS[max];

  return {
    width,
    height,
    breakpoint,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isTouchDevice,
    orientation,
    isXs: width < BREAKPOINTS.sm,
    isSm: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isMd: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isLg: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isXl: width >= BREAKPOINTS.xl && width < BREAKPOINTS["2xl"],
    is2xl: width >= BREAKPOINTS["2xl"],
    up,
    down,
    between,
  };
}
