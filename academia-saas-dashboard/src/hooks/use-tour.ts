"use client";

import { useEffect, useState } from "react";

const TOUR_EVENT = "tour-state-changed";

function getTourState(tourId: string) {
  if (typeof window === "undefined") return true;
  const key = `tour_concluido_${tourId}`;
  return Boolean(window.localStorage.getItem(key));
}

export function useTour(tourId: string) {
  const [jaViu, setJaViu] = useState(true);

  useEffect(() => {
    const syncState = () => {
      setJaViu(getTourState(tourId));
    };

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ tourId?: string }>;
      if (customEvent.detail?.tourId && customEvent.detail.tourId !== tourId) return;
      syncState();
    };

    syncState();
    window.addEventListener("storage", syncState);
    window.addEventListener(TOUR_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener("storage", syncState);
      window.removeEventListener(TOUR_EVENT, handleCustomEvent);
    };
  }, [tourId]);

  function marcarConcluido() {
    window.localStorage.setItem(`tour_concluido_${tourId}`, "1");
    setJaViu(true);
    window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: { tourId } }));
  }

  function resetarTour() {
    window.localStorage.removeItem(`tour_concluido_${tourId}`);
    setJaViu(false);
    window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: { tourId } }));
  }

  return { jaViu, marcarConcluido, resetarTour };
}
