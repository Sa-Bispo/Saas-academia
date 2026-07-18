"use client";

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

export type SignaturePadHandle = {
  toDataURL: () => string | null;
  isEmpty: () => boolean;
  clear: () => void;
};

type Props = {
  className?: string;
};

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  function SignaturePad({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const hasStrokes = useRef(false);

    function getCtx() {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.strokeStyle = "#1e1e1e";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      return ctx;
    }

    function getPos(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ("touches" in e) {
        const t = e.touches[0];
        return {
          x: (t.clientX - rect.left) * scaleX,
          y: (t.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    const handleStart = useCallback((e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      drawing.current = true;
      hasStrokes.current = true;
      const { x, y } = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }, []);

    const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!drawing.current) return;
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      const { x, y } = getPos(e, canvas);
      ctx.lineTo(x, y);
      ctx.stroke();
    }, []);

    const handleEnd = useCallback(() => {
      drawing.current = false;
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.addEventListener("mousedown", handleStart);
      canvas.addEventListener("mousemove", handleMove);
      canvas.addEventListener("mouseup", handleEnd);
      canvas.addEventListener("mouseleave", handleEnd);
      canvas.addEventListener("touchstart", handleStart, { passive: false });
      canvas.addEventListener("touchmove", handleMove, { passive: false });
      canvas.addEventListener("touchend", handleEnd);

      return () => {
        canvas.removeEventListener("mousedown", handleStart);
        canvas.removeEventListener("mousemove", handleMove);
        canvas.removeEventListener("mouseup", handleEnd);
        canvas.removeEventListener("mouseleave", handleEnd);
        canvas.removeEventListener("touchstart", handleStart);
        canvas.removeEventListener("touchmove", handleMove);
        canvas.removeEventListener("touchend", handleEnd);
      };
    }, [handleStart, handleMove, handleEnd]);

    useImperativeHandle(ref, () => ({
      toDataURL() {
        if (!hasStrokes.current) return null;
        return canvasRef.current?.toDataURL("image/png") ?? null;
      },
      isEmpty() {
        return !hasStrokes.current;
      },
      clear() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          hasStrokes.current = false;
        }
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className={className}
        style={{ touchAction: "none" }}
      />
    );
  }
);
