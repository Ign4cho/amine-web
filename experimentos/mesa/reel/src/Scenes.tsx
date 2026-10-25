import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, clamp, display, ease, mono } from "./theme";

const TEAM = ["Guadalupe", "Luciana", "Agustina", "Victoria", "Ignacio"];
const SERVICES = ["Social media manager", "Sesiones de fotos y videos", "Dirección creativa", "Branding", "Desarrollo web"];

export const OpeningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.6 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}>
      <Img
        src={staticFile("amine-logo.png")}
        style={{
          width: 760,
          scale: interpolate(frame, [0, 0.9 * fps], [0.86, 1], { ...clamp, easing: ease }),
          opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], clamp),
          translate: interpolate(frame, [0, 0.9 * fps], ["0px 40px", "0px 0px"], { ...clamp, easing: ease }),
        }}
      />
      <div
        style={{
          marginTop: 56,
          fontFamily: mono,
          fontSize: 34,
          letterSpacing: "0.3em",
          color: C.ink,
          textTransform: "uppercase",
          opacity: interpolate(frame, [0.8 * fps, 1.3 * fps], [0, 1], clamp),
        }}
      >
        Agencia de marketing digital
      </div>
      <Img src={staticFile("star.png")} style={{ position: "absolute", width: 220, top: 150, right: 150, scale: pop(10), rotate: "-14deg" }} />
      <Img src={staticFile("star.png")} style={{ position: "absolute", width: 150, bottom: 170, left: 150, scale: pop(18), rotate: "18deg" }} />
    </AbsoluteFill>
  );
};

export const TeamScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <Img
        src={staticFile("hero-carpeta-foto.png")}
        style={{
          position: "absolute",
          width: 680,
          left: 450,
          top: 40,
          rotate: interpolate(frame, [0, 1.2 * fps], ["14deg", "-4deg"], { ...clamp, easing: ease }),
          translate: interpolate(frame, [0, 1.2 * fps], ["500px 0px", "0px 0px"], { ...clamp, easing: ease }),
        }}
      />
      <div style={{ position: "absolute", left: 80, bottom: 80, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontFamily: mono, fontSize: 30, color: C.mustard, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
          Somos
        </div>
        {TEAM.map((name, i) => (
          <div
            key={name}
            style={{
              fontFamily: display,
              fontSize: 96,
              lineHeight: 0.92,
              color: C.cream,
              opacity: interpolate(frame, [(0.5 + i * 0.22) * fps, (0.8 + i * 0.22) * fps], [0, 1], clamp),
              translate: interpolate(frame, [(0.5 + i * 0.22) * fps, (0.9 + i * 0.22) * fps], ["-60px 0px", "0px 0px"], { ...clamp, easing: ease }),
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const ServicesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: C.mustard, padding: 90, justifyContent: "center" }}>
      <div style={{ fontFamily: mono, fontSize: 30, color: C.ink, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 32 }}>
        Lo que hacemos
      </div>
      {SERVICES.map((s, i) => (
        <div
          key={s}
          style={{
            fontFamily: display,
            fontSize: 94,
            lineHeight: 1.02,
            color: C.ink,
            opacity: interpolate(frame, [(0.2 + i * 0.25) * fps, (0.5 + i * 0.25) * fps], [0, 1], clamp),
            translate: interpolate(frame, [(0.2 + i * 0.25) * fps, (0.7 + i * 0.25) * fps], ["0px 50px", "0px 0px"], { ...clamp, easing: ease }),
          }}
        >
          <span style={{ color: C.cream }}># </span>
          {s}
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });

  return (
    <AbsoluteFill style={{ backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}>
      <Img
        src={staticFile("cta-con-firma.png")}
        style={{
          width: 600,
          rotate: "4deg",
          translate: `0px ${interpolate(drop, [0, 1], [-900, 0])}px`,
        }}
      />
      <div
        style={{
          marginTop: 40,
          fontFamily: mono,
          fontSize: 36,
          color: C.ink,
          letterSpacing: "0.12em",
          opacity: interpolate(frame, [0.7 * fps, 1.1 * fps], [0, 1], clamp),
        }}
      >
        wa.me/5492645827270
      </div>
    </AbsoluteFill>
  );
};
