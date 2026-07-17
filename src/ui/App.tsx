import { useCallback, useEffect, useRef, useState } from "react";
import { key, inBounds, serialize, deserialize, type VoxelMap } from "../core/voxels";
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
import S from "./App.module.css";

type Tool = "place" | "remove" | "paint";
type Dialog = null | "import" | "ai" | "library";

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const voxelsRef = useRef<VoxelMap>(starterTree());
  const undoRef = useRef<VoxelMap[]>([]);
  const restoredRef = useRef(false);
  const [version, setVersion] = useState(0);
  const [tool, setTool] = useState<Tool>("place");
  const [color, setColor] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [shared, setShared] = useState(false);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  toolRef.current = tool;
  colorRef.current = color;
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
    if (voxelsRef.current.size === 0) return;
    snapshot();
    voxelsRef.current = new Map();
    bump();
  }, [snapshot, bump]);

  const replaceModel = useCallback(
    (m: VoxelMap) => {
      snapshot();
      voxelsRef.current = m;
      bump();
    },
    [snapshot, bump]
  );

  const handleTap = useCallback(
    (pick: Pick) => {
      const vox = voxelsRef.current;
      const t = toolRef.current;
      if (pick.type === "ground") {
        if (t !== "place") return;
        snapshot();
        vox.set(key(pick.x, 0, pick.z), colorRef.current);
      } else {
        const [cx, cy, cz] = pick.cell;
        const ck = key(cx, cy, cz);
        if (t === "remove") {
          snapshot();
          vox.delete(ck);
        } else if (t === "paint") {
          if (vox.get(ck) === colorRef.current) return;
          snapshot();
          vox.set(ck, colorRef.current);
        } else {
          const x = cx + pick.normal[0];
          const y = cy + pick.normal[1];
          const z = cz + pick.normal[2];
          if (!inBounds(x, y, z)) return;
          snapshot();
          vox.set(key(x, y, z), colorRef.current);
        }
      }
      bump();
    },
    [snapshot, bump]
  );

  // Scene setup (once)
  useEffect(() => {
    const scene = new VoxelScene(mountRef.current!, { onTap: handleTap });
    sceneRef.current = scene;
    scene.setVoxels(voxelsRef.current);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (saved && !restoredRef.current) {
        const m = deserialize(saved, PALETTE.length);
        if (m.size > 0) voxelsRef.current = m;
      }
      restoredRef.current = true;
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
          Clear
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
