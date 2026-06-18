"use client";

import { MessageCircle, Package, Zap, ShoppingBag, Clock, Check, Smartphone } from "lucide-react";

export function AnimatedIcons() {
  const icons = [
    { Icon: MessageCircle, delay: 0, top: "10%", left: "5%", duration: 5 },
    { Icon: Package, delay: 0.5, top: "20%", right: "8%", duration: 6 },
    { Icon: Zap, delay: 1, top: "50%", left: "3%", duration: 5.5 },
    { Icon: ShoppingBag, delay: 1.5, bottom: "15%", right: "5%", duration: 6.5 },
    { Icon: Clock, delay: 0.8, top: "65%", right: "10%", duration: 7 },
    { Icon: Check, delay: 1.2, bottom: "25%", left: "8%", duration: 5.8 },
    { Icon: Smartphone, delay: 0.3, top: "35%", right: "15%", duration: 6.2 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {icons.map((icon, index) => {
        const Icon = icon.Icon;
        const positionStyle: React.CSSProperties = {};
        
        if ("top" in icon) positionStyle.top = icon.top;
        if ("bottom" in icon) positionStyle.bottom = icon.bottom;
        if ("left" in icon) positionStyle.left = icon.left;
        if ("right" in icon) positionStyle.right = icon.right;

        return (
          <div
            key={index}
            className="absolute"
            style={{
              ...positionStyle,
              animation: `float-up ${icon.duration}s ease-in-out infinite`,
              animationDelay: `${icon.delay}s`,
            }}
          >
            <div
              className="text-brand/60 opacity-0"
              style={{
                animation: `fade-in 0.8s ease-out forwards`,
                animationDelay: `${icon.delay}s`,
              }}
            >
              <Icon size={40} strokeWidth={1.2} />
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0px);
            opacity: 0.4;
          }
          50% {
            opacity: 0.65;
          }
          100% {
            transform: translateY(-40px);
            opacity: 0.35;
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
