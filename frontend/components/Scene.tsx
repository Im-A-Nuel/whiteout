import { Pilgrim } from "./Pixel";

/**
 * Start screen night scene. Sky bands come from CSS, the mountains and the temple are the exact
 * rectangles of the approved design (public/scene.svg, 360 x 195 art px). The scene box scales like
 * `slice` and the pilgrim lives in the same coordinate system, so it always stands on the cliff.
 * Pure decoration, nothing here depends on game state.
 */
export function Scene() {
  return (
    <>
      <div className="sky" />
      <div className="scenebox" aria-hidden="true">
        <div className="svgbg" />
        <Pilgrim variant="down" bob className="walker" />
      </div>
    </>
  );
}
