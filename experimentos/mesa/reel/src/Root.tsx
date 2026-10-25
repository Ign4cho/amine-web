import { Composition, Folder } from "remotion";
import { REEL_DURATION, Reel } from "./Reel";
import { ClosingScene, OpeningScene, ServicesScene, TeamScene } from "./Scenes";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="AmineReel" component={Reel} width={1080} height={1080} fps={30} durationInFrames={REEL_DURATION} />
      <Folder name="Escenas">
        <Composition id="Apertura" component={OpeningScene} width={1080} height={1080} fps={30} durationInFrames={75} />
        <Composition id="Equipo" component={TeamScene} width={1080} height={1080} fps={30} durationInFrames={90} />
        <Composition id="Servicios" component={ServicesScene} width={1080} height={1080} fps={30} durationInFrames={90} />
        <Composition id="Cierre" component={ClosingScene} width={1080} height={1080} fps={30} durationInFrames={75} />
      </Folder>
    </>
  );
};
