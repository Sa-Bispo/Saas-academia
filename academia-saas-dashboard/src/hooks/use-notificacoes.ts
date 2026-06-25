"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type Notificacoes = {
  comprovantes: number;
  parqNovas: number;
};

export function useNotificacoes(): Notificacoes {
  const [counts, setCounts] = useState<Notificacoes>({ comprovantes: 0, parqNovas: 0 });
  const prevRef = useRef<Notificacoes | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/notificacoes/stream");

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as Notificacoes;

        if (prevRef.current) {
          if (data.comprovantes > prevRef.current.comprovantes) {
            toast("Novo comprovante recebido", {
              description: "Há um comprovante aguardando validação.",
              action: {
                label: "Ver",
                onClick: () => { window.location.href = "/cobrancas"; },
              },
            });
          }
          if (data.parqNovas > prevRef.current.parqNovas) {
            toast("Nova ficha PAR-Q recebida", {
              description: "Um aluno enviou uma nova ficha PAR-Q.",
              action: {
                label: "Ver",
                onClick: () => { window.location.href = "/parq-config"; },
              },
            });
          }
        }

        prevRef.current = data;
        setCounts(data);
      } catch { /* JSON inválido */ }
    };

    return () => {
      es.close();
    };
  }, []);

  return counts;
}
