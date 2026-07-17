import { useEffect, useState } from "react";
import Modal from "./Modal";
import S from "./Modal.module.css";
import A from "./App.module.css";
import { deserialize, serialize, type VoxelMap } from "../core/voxels";
import { PALETTE } from "../core/shading";
import {
  deleteEntry,
  listLibrary,
  newId,
  saveEntry,
  type LibraryEntry,
} from "../storage/db";
import { renderThumbnail } from "../three/thumbnail";

interface Props {
  onClose: () => void;
  onLoad: (m: VoxelMap) => void;
  getCurrent: () => VoxelMap;
}

export default function LibraryModal({ onClose, onLoad, getCurrent }: Props) {
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = () => {
    void listLibrary().then(setEntries);
  };
  useEffect(refresh, []);

  const saveCurrent = async () => {
    const current = getCurrent();
    if (current.size === 0) return;
    const entry: LibraryEntry = {
      id: newId(),
      name: `Model ${(entries?.length ?? 0) + 1}`,
      updatedAt: Date.now(),
      model: serialize(current),
      thumb: renderThumbnail(current),
    };
    await saveEntry(entry);
    refresh();
  };

  const rename = async (entry: LibraryEntry, name: string) => {
    if (name.trim() && name !== entry.name) {
      await saveEntry({ ...entry, name: name.trim() });
      refresh();
    }
  };

  const duplicate = async (entry: LibraryEntry) => {
    await saveEntry({
      ...entry,
      id: newId(),
      name: `${entry.name} copy`,
      updatedAt: Date.now(),
    });
    refresh();
  };

  const remove = async (entry: LibraryEntry) => {
    if (confirmDelete !== entry.id) {
      setConfirmDelete(entry.id);
      return;
    }
    setConfirmDelete(null);
    await deleteEntry(entry.id);
    refresh();
  };

  return (
    <Modal title="LIBRARY" onClose={onClose}>
      <div className={S.row}>
        <button
          className={A.btnActive}
          onClick={saveCurrent}
          disabled={getCurrent().size === 0}
        >
          Save current model
        </button>
        <button className={A.btn} onClick={onClose} style={{ marginLeft: "auto" }}>
          Close
        </button>
      </div>
      {entries === null ? (
        <div className={S.note}>Loading…</div>
      ) : entries.length === 0 ? (
        <div className={S.note}>
          Nothing saved yet. "Save current model" keeps a copy here — your
          work-in-progress is always auto-saved separately.
        </div>
      ) : (
        <div className={S.grid}>
          {entries.map((e) => (
            <div className={S.card} key={e.id}>
              <button
                className={S.thumbBtn}
                title={`Open ${e.name}`}
                onClick={() => {
                  onLoad(deserialize(e.model, PALETTE.length));
                  onClose();
                }}
              >
                <img src={e.thumb} alt={e.name} />
              </button>
              <input
                className={S.cardName}
                defaultValue={e.name}
                aria-label={`Rename ${e.name}`}
                onBlur={(ev) => rename(e, ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") (ev.target as HTMLInputElement).blur();
                }}
              />
              <div className={S.cardActions}>
                <button className={S.miniBtn} onClick={() => duplicate(e)}>
                  Copy
                </button>
                <button
                  className={S.miniBtnDanger}
                  onBlur={() => setConfirmDelete(null)}
                  onClick={() => remove(e)}
                >
                  {confirmDelete === e.id ? "Sure?" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
