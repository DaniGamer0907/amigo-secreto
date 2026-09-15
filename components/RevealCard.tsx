"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface RevealCardProps {
  receiverName: string;
  revealed: boolean;
  onReveal: () => void;
}

export default function RevealCard({ receiverName, revealed, onReveal }: RevealCardProps) {
  const [flipped, setFlipped] = useState(revealed);
  const [tapped, setTapped] = useState(false);

  const handleInteraction = () => {
    if (!tapped) {
      setTapped(true);
      setFlipped(true);
      if (!revealed) {
        onReveal();
      }
    }
  };

  return (
    <div
      className="w-full max-w-xs mx-auto aspect-[4/5] relative select-none"
      onClick={handleInteraction}
      role="button"
      aria-label={flipped ? "Tarjeta revelada" : "Toca para revelar tu amigo secreto"}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleInteraction(); }}
    >
      <motion.div
        className="w-full h-full relative"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Frente — regalo cerrado */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl shadow-2xl bg-gradient-to-br from-rose-400 via-rose-300 to-amber-200 text-white backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-8xl mb-6 drop-shadow-lg"
            aria-label="Regalo"
          >
            🎁
          </motion.div>
          <h2 className="text-2xl font-extrabold tracking-tight drop-shadow-md text-center leading-tight px-4">
            Toca para revelar
          </h2>
          <p className="text-sm font-medium opacity-90 mt-2">Tu amigo secreto te espera</p>
          {!revealed && (
            <div className="mt-6 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur text-xs font-bold tracking-wide">
              TOCA O DESLIZA
            </div>
          )}
        </div>

        {/* Reverso — revelado */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl shadow-2xl bg-gradient-to-br from-amber-50 via-rose-50 to-rose-100 border-2 border-rose-200 text-stone-800 backface-hidden text-center px-6"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="text-6xl mb-4 drop-shadow-sm">✨</div>
          <p className="text-xs font-extrabold text-rose-500 uppercase tracking-[0.15em] mb-2">
            Tu amigo secreto es:
          </p>
          <h3 className="text-4xl font-black text-stone-800 leading-none tracking-tight mb-3">
            {receiverName || "???"}
          </h3>
          {revealed && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-200">
              <span>✓</span> Ya revelado
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
