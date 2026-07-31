declare module "fontkit" {
  type FontGlyph = object;

  type FontSubset = {
    includeGlyph(glyph: FontGlyph): void;
    encode(): Buffer | Uint8Array;
  };

  type FontFace = {
    layout(text: string): { glyphs: FontGlyph[] };
    createSubset(): FontSubset;
  };

  export function openSync(path: string, postscriptName?: string): FontFace;
}
