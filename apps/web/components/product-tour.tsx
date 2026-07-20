'use client';

import { useEffect, useRef } from 'react';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  hasCompletedTour,
  markTourCompleted,
  tourSteps,
} from '@/lib/product-tour';

let activeDriver: Driver | null = null;

export function startProductTour(options?: { force?: boolean }) {
  if (typeof window === 'undefined') return;
  if (!options?.force && hasCompletedTour()) return;

  activeDriver?.destroy();

  const tour = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: 'closerai-tour-popover',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    steps: tourSteps.map((step) => ({
      element: step.element,
      popover: {
        title: step.title,
        description: step.description,
        side: step.side,
        align: step.align,
      },
    })),
    onDestroyStarted: () => {
      markTourCompleted();
      tour.destroy();
      activeDriver = null;
    },
  });

  activeDriver = tour;
  tour.drive();
}

export function ProductTour() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const timer = window.setTimeout(() => {
      startProductTour();
    }, 600);

    return () => {
      window.clearTimeout(timer);
      activeDriver?.destroy();
      activeDriver = null;
    };
  }, []);

  return null;
}
