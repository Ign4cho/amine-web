import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadCourier } from "@remotion/google-fonts/CourierPrime";
import { Easing } from "remotion";

export const { fontFamily: display } = loadBebas("normal", { weights: ["400"], subsets: ["latin"] });
export const { fontFamily: mono } = loadCourier("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const C = {
  cream: "#F9F4EA",
  ink: "#2D2A29",
  mustard: "#F0C14B",
  amber: "#E8B83D",
};

// Misma curva que usa la web (cubic-bezier(0.32, 0.72, 0, 1)).
export const ease = Easing.bezier(0.32, 0.72, 0, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
