import { useRef, useState } from "react";
import Modal from "./Modal";
import S from "./Modal.module.css";
import A from "./App.module.css";

interface Props {
  onClose: () => void;
  // Returns false if the text wasn't a usable model.
  onImportText: (text: string) => boolean;
}

// Import accepts pasted text, not just files — the LLM workflow is
// copy-paste-shaped, especially on mobile.
export default function ImportModal({ onClose, onImportText }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importText = (t: string) => {
    if (onImportText(t)) {
      onClose();
    } else {
      setError(true);
    }
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importText(String(reader.result));
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Modal title="IMPORT MODEL" onClose={onClose}>
      <div className={S.note}>
        Paste model JSON below (from a save, a friend, or an AI), or load a .json
        file. Format: {"{"}size: 16, voxels: [{"{"}x, y, z, c{"}"}]{"}"}.
      </div>
      <textarea
        className={S.textarea}
        value={text}
        placeholder='{"size":16,"voxels":[{"x":8,"y":0,"z":8,"c":0}]}'
        onChange={(e) => {
          setText(e.target.value);
          setError(false);
        }}
      />
      {error && (
        <div className={S.error}>
          Couldn't read that — check it's model JSON with a voxels list.
        </div>
      )}
      <div className={S.rowEnd}>
        <button className={A.btn} onClick={() => fileRef.current?.click()}>
          Load file…
        </button>
        <button
          className={A.btnActive}
          disabled={!text.trim()}
          onClick={() => importText(text)}
        >
          Import
        </button>
        <button className={A.btn} onClick={onClose}>
          Cancel
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={importFile}
      />
    </Modal>
  );
}
