import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { useVideoConfig } from "remotion";
import { ClosingScene, OpeningScene, ServicesScene, TeamScene } from "./Scenes";

// Duración total: 75 + 90 + 90 + 75 - 3 transiciones de 15 = 285 frames.
export const REEL_DURATION = 285;

export const Reel: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Apertura" durationInFrames={75} premountFor={fps}>
        <OpeningScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Equipo" durationInFrames={90} premountFor={fps}>
        <TeamScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Servicios" durationInFrames={90} premountFor={fps}>
        <ServicesScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Cierre" durationInFrames={75} premountFor={fps}>
        <ClosingScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
