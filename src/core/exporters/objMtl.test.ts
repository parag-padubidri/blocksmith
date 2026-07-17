import { describe, expect, it } from "vitest";
import { toOBJMTL } from "./objMtl";
import { key, type VoxelMap } from "../voxels";

const count = (s: string, prefix: string) =>
  s.split("\n").filter((l) => l.startsWith(prefix)).length;

describe("toOBJMTL", () => {
  it("single voxel: 24 verts, 6 quad faces, 6 materials", () => {
    const m: VoxelMap = new Map([[key(0, 0, 0), 0]]);
    const { obj, mtl } = toOBJMTL(m);
    expect(count(obj, "v ")).toBe(24);
    expect(count(obj, "f ")).toBe(6);
    expect(count(mtl, "newmtl ")).toBe(6);
    expect(obj).toContain("mtllib model.mtl");
    expect(mtl).toContain("illum 0");
  });

  it("two stacked voxels, different colors: 40 verts, 10 faces", () => {
    const m: VoxelMap = new Map([
      [key(5, 0, 5), 0],
      [key(5, 1, 5), 1],
    ]);
    const { obj } = toOBJMTL(m);
    expect(count(obj, "v ")).toBe(40);
    expect(count(obj, "f ")).toBe(10);
  });

  it("material names encode color and direction", () => {
    const m: VoxelMap = new Map([[key(1, 1, 1), 7]]);
    const { obj, mtl } = toOBJMTL(m);
    for (let d = 0; d < 6; d++) {
      expect(obj).toContain(`usemtl c7_d${d}`);
      expect(mtl).toContain(`newmtl c7_d${d}`);
    }
  });

  it("+y face material is brighter than -y (shade baked into Kd)", () => {
    const m: VoxelMap = new Map([[key(0, 0, 0), 5]]); // Stone #8d8d8d
    const { mtl } = toOBJMTL(m);
    const kd = (name: string) => {
      const i = mtl.indexOf(`newmtl ${name}`);
      const match = mtl.slice(i).match(/Kd ([\d.]+) /);
      return Number(match![1]);
    };
    expect(kd("c5_d2")).toBeGreaterThan(kd("c5_d3")); // +y (1.0) > -y (0.5)
  });
});
