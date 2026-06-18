declare module "jspdf" {
  export class jsPDF {
    setFontSize(size: number): void;
    text(text: string, x: number, y: number): void;
    setLineWidth(width: number): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    addPage(): void;
    save(filename: string): void;
  }
}
