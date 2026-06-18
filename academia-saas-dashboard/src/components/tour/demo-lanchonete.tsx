"use client";

import { useEffect, useRef, useState } from "react";

export function DemoLanchonete({ onClose }: { onClose: () => void }) {
  const [cursX, setCursX] = useState(50);
  const [cursY, setCursY] = useState(50);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inputNome, setInputNome] = useState("");
  const [inputPreco, setInputPreco] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [newProduct, setNewProduct] = useState(false);
  const [narrator, setNarrator] = useState("Aqui ficam todos os seus produtos cadastrados");
  const [progress, setProgress] = useState(10);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function addTimer(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }

  function typeText(setter: (v: string) => void, text: string, startMs: number, charMs = 75) {
    for (let i = 0; i <= text.length; i++) {
      addTimer(() => setter(text.slice(0, i)), startMs + i * charMs);
    }
  }

  useEffect(() => {
    addTimer(() => { setNarrator("Os cards mostram o resumo do cardápio em tempo real"); setProgress(25); }, 3000);

    addTimer(() => {
      setNarrator("Clique em '+ Novo Item' para cadastrar um produto");
      setProgress(40);
      setCursX(82);
      setCursY(8);
    }, 5500);

    addTimer(() => {
      setSheetOpen(true);
      setCursX(75);
      setCursY(40);
      setNarrator("Preencha o nome do produto");
      setProgress(55);
    }, 7000);

    typeText(setInputNome, "Porção de Batata Frita", 8000, 70);

    addTimer(() => {
      setCursX(75);
      setCursY(55);
      setNarrator("Informe o preço");
    }, 10500);

    typeText(setInputPreco, "R$ 18,00", 11000, 80);

    addTimer(() => {
      setShowSave(true);
      setCursX(75);
      setCursY(82);
      setNarrator("Clique em Salvar — o bot já sabe vender esse produto!");
      setProgress(75);
    }, 13000);

    addTimer(() => {
      setSheetOpen(false);
      setNewProduct(true);
      setProgress(100);
      setNarrator("Produto adicionado! O bot já pode atender pedidos. 🎉");
      setCursX(50);
      setCursY(60);
    }, 15000);

    addTimer(() => setNarrator(""), 18500);

    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: "16px",
          width: "min(700px, 95vw)",
          overflow: "hidden",
          border: "1px solid var(--card-border)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
              🎬 Como funciona o Cardápio
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
              Veja o sistema funcionando antes de começar
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              fontSize: "20px",
              lineHeight: 1,
              padding: "4px",
            }}
          >
            ×
          </button>
        </div>

        {/* Barra de progresso */}
        <div style={{ height: "2px", background: "var(--bg-secondary)" }}>
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #1D9E75, #22c55e)",
              width: `${progress}%`,
              transition: "width 0.45s ease",
              boxShadow: "0 0 6px rgba(29,158,117,0.5)",
            }}
          />
        </div>

        {/* Tela simulada */}
        <div style={{ position: "relative", height: "340px", overflow: "hidden" }}>
          {/* Header da tela simulada */}
          <div
            style={{
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              Cardápio
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "default",
                }}
              >
                Importar com IA
              </button>
              <button
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#1D9E75",
                  color: "white",
                  fontWeight: 600,
                  cursor: "default",
                }}
              >
                + Novo Item
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", padding: "12px 16px" }}>
            {[
              { l: "Total de itens", v: newProduct ? "4" : "3", destaque: false },
              { l: "Disponíveis", v: newProduct ? "4" : "3", destaque: true },
              { l: "Indisponíveis", v: "0", destaque: false },
              { l: "Combos ativos", v: "0", destaque: false },
            ].map((s, i) => (
              <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "8px 10px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "2px" }}>{s.l}</div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: s.destaque ? "#1D9E75" : "var(--text-primary)",
                    transition: "color 0.3s",
                  }}
                >
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          {/* Lista de produtos */}
          <div
            style={{
              margin: "0 16px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "7px 12px",
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--text-tertiary)",
                letterSpacing: "0.5px",
                borderBottom: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                textTransform: "uppercase",
              }}
            >
              Lanches
            </div>
            {["X-Bacon — R$ 22,00", "X-Tudo — R$ 26,00", "X-Burguer — R$ 18,00"].map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 12px",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#1D9E75", flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: "12px", color: "var(--text-primary)" }}>{p.split(" — ")[0]}</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{p.split(" — ")[1]}</div>
                <div style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(29,158,117,0.1)", color: "#1D9E75" }}>
                  Disponível
                </div>
              </div>
            ))}

            {newProduct && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 12px",
                  background: "rgba(29,158,117,0.06)",
                  animation: "lanchFadeSlideIn 0.4s ease",
                }}
              >
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#1D9E75", flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: "12px", color: "var(--text-primary)" }}>Porção de Batata Frita</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>R$ 18,00</div>
                <div style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(29,158,117,0.1)", color: "#1D9E75" }}>
                  Disponível
                </div>
              </div>
            )}
          </div>

          {/* Sheet lateral */}
          {sheetOpen && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "240px",
                height: "100%",
                background: "var(--card-bg)",
                borderLeft: "1px solid var(--border-color)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                animation: "lanchSlideIn 0.3s ease",
                zIndex: 10,
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Novo produto</div>

              {[
                { label: "Nome do produto", value: inputNome, typing: true },
                { label: "Preço", value: inputPreco, typing: true },
                { label: "Categoria", value: "Lanches", typing: false },
              ].map((f, i) => (
                <div key={i}>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>{f.label}</div>
                  <div
                    style={{
                      height: "30px",
                      background: "var(--bg-secondary)",
                      border: `1px solid ${f.typing && f.value ? "#1D9E75" : "var(--border-color)"}`,
                      borderRadius: "6px",
                      padding: "0 8px",
                      fontSize: "12px",
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      transition: "border-color 0.2s",
                    }}
                  >
                    {f.value}
                  </div>
                </div>
              ))}

              {showSave && (
                <div
                  style={{
                    marginTop: "auto",
                    padding: "8px",
                    borderRadius: "6px",
                    background: "#1D9E75",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 600,
                    textAlign: "center",
                    animation: "lanchFadeIn 0.3s ease",
                    cursor: "default",
                  }}
                >
                  Salvar produto
                </div>
              )}
            </div>
          )}

          {/* Cursor animado */}
          <div
            style={{
              position: "absolute",
              left: `${cursX}%`,
              top: `${cursY}%`,
              transition: "left 0.5s cubic-bezier(0.4,0,0.2,1), top 0.5s cubic-bezier(0.4,0,0.2,1)",
              pointerEvents: "none",
              zIndex: 20,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-primary)">
              <path d="M4 0l16 12-7 1-4 8z" />
            </svg>
          </div>
        </div>

        {/* Narrador */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minHeight: "52px",
          }}
        >
          {narrator ? (
            <>
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#1D9E75",
                  animation: "lanchBlink 1s infinite",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{narrator}</span>
            </>
          ) : (
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Pronto! Agora o tour guiado vai te mostrar cada funcionalidade.
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              padding: "7px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#1D9E75",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: "0 3px 12px rgba(29,158,117,0.38)",
            }}
          >
            Começar agora →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes lanchSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes lanchFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lanchFadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lanchBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
