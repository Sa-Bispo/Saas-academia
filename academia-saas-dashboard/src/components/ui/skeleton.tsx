import React from "react";

type SkeletonPulseProps = {
  style?: React.CSSProperties;
};

export function SkeletonPulse({ style }: SkeletonPulseProps) {
  return (
    <div
      style={{
        background:
          "linear-gradient(90deg, var(--skeleton-from) 25%, var(--skeleton-to) 50%, var(--skeleton-from) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
        borderRadius: "var(--border-radius-md, 8px)",
        ...style,
      }}
    />
  );
}

export function SkeletonStat() {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "0.5px solid var(--card-border)",
        borderRadius: "var(--border-radius-lg, 14px)",
        boxShadow: "var(--card-shadow)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <SkeletonPulse style={{ height: "12px", width: "60%", borderRadius: "4px" }} />
      <SkeletonPulse style={{ height: "28px", width: "40%", borderRadius: "6px" }} />
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "0.5px solid var(--card-border)",
        borderRadius: "var(--border-radius-lg, 14px)",
        boxShadow: "var(--card-shadow)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SkeletonPulse style={{ height: "14px", width: "45%", borderRadius: "4px" }} />
        <SkeletonPulse style={{ height: "20px", width: "60px", borderRadius: "20px" }} />
      </div>
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonPulse
          key={i}
          style={{
            height: "12px",
            width: i % 2 === 0 ? "70%" : "50%",
            borderRadius: "4px",
          }}
        />
      ))}
      <div
        style={{
          paddingTop: "10px",
          borderTop: "0.5px solid var(--border-color)",
          display: "flex",
          gap: "6px",
        }}
      >
        <SkeletonPulse style={{ height: "28px", width: "70px", borderRadius: "6px" }} />
        <SkeletonPulse style={{ height: "28px", width: "70px", borderRadius: "6px" }} />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderBottom: "0.5px solid var(--border-color)",
      }}
    >
      <SkeletonPulse style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 }} />
      <SkeletonPulse style={{ height: "13px", flex: 1, borderRadius: "4px" }} />
      <SkeletonPulse style={{ height: "13px", width: "80px", borderRadius: "4px" }} />
      <SkeletonPulse style={{ height: "24px", width: "60px", borderRadius: "20px" }} />
      <SkeletonPulse style={{ height: "28px", width: "50px", borderRadius: "6px" }} />
    </div>
  );
}

export function SkeletonKanbanCard() {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "0.5px solid var(--card-border)",
        borderRadius: "var(--border-radius-lg, 14px)",
        boxShadow: "var(--card-shadow)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginBottom: "8px",
      }}
    >
      <SkeletonPulse style={{ height: "13px", width: "55%", borderRadius: "4px" }} />
      <SkeletonPulse style={{ height: "11px", width: "80%", borderRadius: "4px" }} />
      <SkeletonPulse style={{ height: "11px", width: "40%", borderRadius: "4px" }} />
      <div
        style={{
          display: "flex",
          gap: "6px",
          paddingTop: "6px",
          borderTop: "0.5px solid var(--border-color)",
        }}
      >
        <SkeletonPulse style={{ height: "26px", width: "80px", borderRadius: "6px" }} />
        <SkeletonPulse style={{ height: "26px", width: "80px", borderRadius: "6px" }} />
      </div>
    </div>
  );
}
