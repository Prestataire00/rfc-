import { describe, it, expect } from "vitest";
import {
  pixelsToPoints,
  pointsToPixels,
  type ZoneCoords,
} from "@/lib/signatures/zones";

describe("zones conversions pixels↔points", () => {
  it("pixelsToPoints convertit avec un scale de 1.5", () => {
    const zone: ZoneCoords = { x: 150, y: 300, width: 75, height: 30 };
    const result = pixelsToPoints(zone, 1.5);
    expect(result).toEqual({ x: 100, y: 200, width: 50, height: 20 });
  });

  it("pixelsToPoints avec scale 1.0 retourne les mêmes valeurs", () => {
    const zone: ZoneCoords = { x: 10, y: 20, width: 30, height: 40 };
    expect(pixelsToPoints(zone, 1.0)).toEqual(zone);
  });

  it("pointsToPixels est l'inverse de pixelsToPoints", () => {
    const original: ZoneCoords = { x: 100, y: 200, width: 50, height: 20 };
    const pixels = pointsToPixels(original, 1.5);
    const back = pixelsToPoints(pixels, 1.5);
    expect(back.x).toBeCloseTo(original.x, 5);
    expect(back.y).toBeCloseTo(original.y, 5);
    expect(back.width).toBeCloseTo(original.width, 5);
    expect(back.height).toBeCloseTo(original.height, 5);
  });

  it("pixelsToPoints rejette un scale nul", () => {
    expect(() => pixelsToPoints({ x: 1, y: 1, width: 1, height: 1 }, 0)).toThrow();
  });

  it("pixelsToPoints rejette un scale négatif", () => {
    expect(() => pixelsToPoints({ x: 1, y: 1, width: 1, height: 1 }, -1)).toThrow();
  });

  it("pointsToPixels rejette un scale nul", () => {
    expect(() => pointsToPixels({ x: 1, y: 1, width: 1, height: 1 }, 0)).toThrow();
  });
});
