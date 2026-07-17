import { useEffect, useState } from "react";
import Modal from "./Modal";
import S from "./Modal.module.css";
import A from "./App.module.css";
import { TEMPLATES } from "../core/templates";
import type { VoxelMap } from "../core/voxels";
import { renderThumbnail } from "../three/thumbnail";

interface Props {
  onClose: () => void;
  onPick: (m: VoxelMap) => void;
}

let thumbCache: Record<string, string> | null = null;

export default function TemplatesModal({ onClose, onPick }: Props) {
  const [thumbs, setThumbs] = useState<Record<string, string> | null>(thumbCache);

  useEffect(() => {
    if (thumbCache) return;
    thumbCache = Object.fromEntries(
      TEMPLATES.map((t) => [t.id, renderThumbnail(t.build())])
    );
    setThumbs(thumbCache);
  }, []);

  return (
    <Modal title="START BUILDING" onClose={onClose}>
      <div className={S.note}>
        Pick a starter model to remix, or begin with an empty grid.
      </div>
      <div className={S.grid}>
        {TEMPLATES.map((t) => (
          <div className={S.card} key={t.id}>
            <button
              className={S.thumbBtn}
              onClick={() => {
                onPick(t.build());
                onClose();
              }}
            >
              {thumbs?.[t.id] ? (
                <img src={thumbs[t.id]} alt={t.name} />
              ) : (
                <div style={{ paddingTop: "100%" }} />
              )}
            </button>
            <div style={{ fontSize: 11, textAlign: "center" }}>{t.name}</div>
          </div>
        ))}
      </div>
      <div className={S.rowEnd}>
        <button className={A.btn} onClick={onClose}>
          Empty grid
        </button>
      </div>
    </Modal>
  );
}
