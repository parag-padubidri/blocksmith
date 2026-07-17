import { useCallback, useEffect, useRef, useState } from "react";
import {
  GRID,
  key,
  inBounds,
  serialize,
  deserialize,
  type Cell,
  type VoxelMap,
} from "../core/voxels";
import { PALETTE } from "../core/shading";
import { starterTree } from "../core/templates";
import { toJSONText, fromJSONText } from "../core/exporters/json";
import { toOBJMTL } from "../core/exporters/objMtl";
import { toGLB } from "../core/exporters/gltf";
import { parseShareHash, shareFragment } from "../core/urlCodec";
import { loadAutosave, saveAutosave } from "../storage/db";
import { VoxelScene, type Pick } from "../three/scene";
import { downloadBlob, downloadText } from "./download";
import ImportModal from "./ImportModal";
import AIHelpModal from "./AIHelpModal";
import LibraryModal from "./LibraryModal";
import TemplatesModal from "./TemplatesModal";
import Onboarding, { ONBOARDED_KEY } from "./Onboarding";
import S from "./App.module.css";

type Tool = "place" | "remove" | "paint";
type Dialog = null | "import" | "ai" | "library" | "templates";

const mirrorX = (x: number) => GRID - 1 - x;

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const voxelsRef = useRef<VoxelMap>(starterTree());
  const undoRef = useRef<VoxelMap[]>([]);
  const restoredRef = useRef(false);
  const [version, setVersion] = useState(0);
  const [tool, setTool] = useState<Tool>("place");
  const [color, setColor] = useState(0);
  const [mirror, setMirror] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [shared, setShared] = useState(false);
  const [showTour, setShowTour] = useState(() => {
    try {
      return !localStorage.getItem(ONBOARDED_KEY);
    } catch {
      return false;
    }
  });
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const mirrorRef = useRef(mirror);
  toolRef.current = tool;
  colorRef.current = color;
  mirrorRef.current = mirror;
  const sceneRef = useRef<VoxelScene | null>(null);

  const bump = useCallback(() => setVersion((n) => n + 1), []);

  const snapshot = useCallback(() => {
    undoRef.current.push(new Map(voxelsRef.current));
    if (undoRef.current.length > 60) undoRef.current.shift();
  }, []);

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (prev) {
      voxelsRef.current = prev;
      bump();
    }
  }, [bump]);

  const clearAll = useCallback(() => {
    if (voxelsRef.current.size > 0) {
      snapshot();
      voxelsRef.current = new Map();
      bump();
    }
    setDialog("templates");
  }, [snapshot, bump]);

  const replaceModel = useCallback(
    (m: VoxelMap) => {
      snapshot();
      voxelsRef.current = m;
      bump();
    },
    [snapshot, bump]
  );

  // With mirror mode on, an action lands on both sides of the x symmetry plane.
  const withMirror = useCallback((cell: Cell): Cell[] => {
    const cells: Cell[] = [cell];
    if (mirrorRef.current) {
      const mx = mirrorX(cell[0]);
      if (mx !== cell[0]) cells.push([mx, cell[1], cell[2]]);
    }
    return cells;
  }, []);

  const placeTargets = useCallback(
    (pick: Pick): Cell[] => {
      let target: Cell | null = null;
      if (pick.type === "ground") {
        target = [pick.x, 0, pick.z];
      } else {
        const t: Cell = [
          pick.cell[0] + pick.normal[0],
          pick.cell[1] + pick.normal[1],
          pick.cell[2] + pick.normal[2],
        ];
        if (inBounds(t[0], t[1], t[2])) target = t;
      }
      return target ? withMirror(target) : [];
    },
    [withMirror]
  );

  const handleTap = useCallback(
    (pick: Pick) => {
      const vox = voxelsRef.current;
      const t = toolRef.current;
      if (t === "place") {
        const cells = placeTargets(pick);
        if (!cells.length) return;
        snapshot();
        for (const [x, y, z] of cells) vox.set(key(x, y, z), colorRef.current);
      } else if (pick.type === "voxel") {
        const cells = withMirror(pick.cell);
        if (t === "remove") {
          snapshot();
          for (const [x, y, z] of cells) vox.delete(key(x, y, z));
        } else {
          const targets = cells.filter(([x, y, z]) => {
            const c = vox.get(key(x, y, z));
            return c !== undefined && c !== colorRef.current;
          });
          if (!targets.length) return;
          snapshot();
          for (const [x, y, z] of targets) vox.set(key(x, y, z), colorRef.current);
        }
      } else {
        return;
      }
      bump();
    },
    [snapshot, bump, withMirror, placeTargets]
  );

  const handleHover = useCallback(
    (pick: Pick | null) => {
      const scene = sceneRef.current;
      if (!scene) return;
      if (!pick || toolRef.current !== "place") {
        scene.setGhost([]);
        return;
      }
      scene.setGhost(placeTargets(pick), PALETTE[colorRef.current].hex);
    },
    [placeTargets]
  );

  // Scene setup (once)
  useEffect(() => {
    const scene = new VoxelScene(mountRef.current!, {
      onTap: handleTap,
      onHover: handleHover,
    });
    sceneRef.current = scene;
    scene.setVoxels(voxelsRef.current);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ghost is stale when the tool/color changes away from the pointer.
  useEffect(() => {
    if (tool !== "place") sceneRef.current?.setGhost([]);
  }, [tool]);

  // Restore on load: share link first, then autosave, else keep the starter.
  useEffect(() => {
    const fromHash = parseShareHash(location.hash);
    if (fromHash) {
      // The shared model becomes current work; drop the hash so a refresh
      // resumes from autosave instead of resetting to the link's snapshot.
      history.replaceState(null, "", location.pathname + location.search);
      voxelsRef.current = fromHash;
      restoredRef.current = true;
      bump();
      return;
    }
    void loadAutosave().then((saved) => {
      if (restoredRef.current) return;
      restoredRef.current = true;
      if (saved) {
        const m = deserialize(saved, PALETTE.length);
        voxelsRef.current = m;
        if (m.size === 0) setDialog("templates");
      }
      bump();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync mesh + debounced autosave on every edit
  useEffect(() => {
    sceneRef.current?.setVoxels(voxelsRef.current);
    if (!restoredRef.current) return;
    const t = setTimeout(() => {
      void saveAutosave(serialize(voxelsRef.current));
    }, 400);
    return () => clearTimeout(t);
  }, [version]);

  // ----- import / export / share -----
  const exportJSON = () =>
    downloadText("model.json", toJSONText(voxelsRef.current), "application/json");

  const exportOBJ = () => {
    const { obj, mtl } = toOBJMTL(voxelsRef.current);
    downloadText("model.obj", obj);
    downloadText("model.mtl", mtl);
  };

  const exportGLB = async () => {
    if (voxelsRef.current.size === 0) return;
    const buf = await toGLB(voxelsRef.current);
    downloadBlob("model.glb", new Blob([buf], { type: "model/gltf-binary" }));
  };

  const share = async () => {
    if (voxelsRef.current.size === 0) return;
    const url =
      location.origin + location.pathname + location.search + shareFragment(voxelsRef.current);
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const importText = useCallback(
    (text: string) => {
      const m = fromJSONText(text);
      if (!m) return false;
      replaceModel(m);
      return true;
    },
    [replaceModel]
  );

  const count = voxelsRef.current.size;

  return (
    <div className={S.app}>
      <div className={S.bar}>
        <span className={S.title}>BLOCKSMITH</span>
        <button className={S.btn} onClick={undo} title="Undo">
          Undo
        </button>
        <button className={S.btn} onClick={clearAll}>
          New
        </button>
        <button className={S.btn} onClick={() => setDialog("library")}>
          Library
        </button>
        <button className={S.btn} onClick={() => setDialog("import")}>
          Import
        </button>
        <button className={S.btn} onClick={share}>
          {shared ? "Link copied!" : "Share"}
        </button>
        <button className={S.btn} onClick={exportJSON}>
          JSON
        </button>
        <button className={S.btn} onClick={exportOBJ}>
          OBJ
        </button>
        <button className={S.btn} onClick={exportGLB}>
          GLB
        </button>
        <button className={S.btn} onClick={() => setDialog("ai")}>
          AI
        </button>
      </div>

      <div className={S.canvas} ref={mountRef}>
        <div className={S.hint}>
          tap: use tool &nbsp;·&nbsp; drag: orbit &nbsp;·&nbsp; scroll / pinch: zoom
          <br />
          {count} blocks
        </div>
        {showTour && <Onboarding onDone={() => setShowTour(false)} />}
      </div>

      {dialog === "import" && (
        <ImportModal onClose={() => setDialog(null)} onImportText={importText} />
      )}
      {dialog === "ai" && (
        <AIHelpModal
          onClose={() => setDialog(null)}
          onOpenImport={() => setDialog("import")}
        />
      )}
      {dialog === "library" && (
        <LibraryModal
          onClose={() => setDialog(null)}
          onLoad={replaceModel}
          getCurrent={() => voxelsRef.current}
        />
      )}
      {dialog === "templates" && (
        <TemplatesModal onClose={() => setDialog(null)} onPick={replaceModel} />
      )}

      <div className={S.footer}>
        <button
          className={tool === "place" ? S.btnActive : S.btn}
          onClick={() => setTool("place")}
        >
          Place
        </button>
        <button
          className={tool === "remove" ? S.btnActive : S.btn}
          onClick={() => setTool("remove")}
        >
          Break
        </button>
        <button
          className={tool === "paint" ? S.btnActive : S.btn}
          onClick={() => setTool("paint")}
        >
          Paint
        </button>
        <button
          className={mirror ? S.btnActive : S.btn}
          onClick={() => setMirror(!mirror)}
          title="Mirror every edit across the X axis"
        >
          Mirror
        </button>
        <div className={S.swatchRow}>
          {PALETTE.map((p, i) => (
            <button
              key={p.name}
              title={p.name}
              aria-label={`Color: ${p.name}`}
              className={i === color ? S.swatchActive : S.swatch}
              style={{ background: p.hex }}
              onClick={() => {
                setColor(i);
                if (tool === "remove") setTool("place");
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
