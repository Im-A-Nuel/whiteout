import { Pilgrim } from "./Pixel";

/**
 * Night scene. Sky bands come from CSS, the mountains and the temple are the exact rectangles of the
 * approved design (public/scene.svg, 360 x 195 art px). The scene box scales like `slice` and the
 * pilgrim lives in the same coordinate system, so it always stands on the cliff.
 * `dim` turns it into a quiet fixed backdrop for the secondary screens. Pure decoration.
 */
export function Scene({ walker = true, dim = false }: { walker?: boolean; dim?: boolean }) {
  return (
    <>
      <div className="sky" />
      <div className={`scenebox${dim ? " dim" : ""}`} aria-hidden="true">
        <div className="svgbg" />
        {walker && <Pilgrim variant="down" bob className="walker" />}
      </div>
    </>
  );
}
