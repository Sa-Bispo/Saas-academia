declare module "react-confetti" {
  import { ComponentType } from "react";

  export type ConfettiProps = {
    width?: number;
    height?: number;
    numberOfPieces?: number;
    recycle?: boolean;
    gravity?: number;
    className?: string;
  };

  const Confetti: ComponentType<ConfettiProps>;
  export default Confetti;
}
