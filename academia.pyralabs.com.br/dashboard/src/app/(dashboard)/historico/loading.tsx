import { SkeletonPulse, SkeletonRow, SkeletonStat } from "@/components/ui/skeleton";

export default function LoadingHistorico() {
  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <SkeletonPulse style={{ height: "28px", width: "240px", borderRadius: "6px" }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      <div
        style={{
          background: "var(--card-bg)",
          border: "0.5px solid var(--card-border)",
          borderRadius: "var(--border-radius-lg, 14px)",
          boxShadow: "var(--card-shadow)",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
