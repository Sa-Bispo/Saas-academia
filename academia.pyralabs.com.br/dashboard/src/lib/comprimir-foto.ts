/**
 * Redimensiona e comprime uma imagem selecionada para um data URL JPEG leve.
 * Se o caminho via canvas falhar (comum no iOS com HEIC grande), cai num
 * fallback que lê o arquivo original direto — garantindo que sempre haja preview.
 */
export function comprimirFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lerDireto = () => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("leitura falhou"));
      reader.onerror = () => reject(new Error("leitura falhou"));
      reader.readAsDataURL(file);
    };

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const MAX = 512;
        let { width, height } = img;
        if (!width || !height) { URL.revokeObjectURL(url); return lerDireto(); }
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); return lerDireto(); }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.62));
        URL.revokeObjectURL(url);
      } catch {
        URL.revokeObjectURL(url);
        lerDireto();
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); lerDireto(); };
    img.src = url;
  });
}
