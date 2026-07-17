import { useState } from "react";
import Modal from "./Modal";
import S from "./Modal.module.css";
import A from "./App.module.css";
import { PALETTE } from "../core/shading";

interface Props {
  onClose: () => void;
  onOpenImport: () => void;
}

const paletteList = PALETTE.map((p, i) => `${i} ${p.name} ${p.hex}`).join(", ");

export const PROMPT_TEMPLATE =
  `Generate Blocksmith JSON for a small sailboat. ` +
  `Output only valid JSON, no explanation. ` +
  `Format: {"size":16,"voxels":[{"x":8,"y":0,"z":8,"c":0}]}. ` +
  `Coordinates are integers 0-15, y is up (y=0 is the ground). ` +
  `c is a palette index: ${paletteList}. ` +
  `Keep the model centered around x=8, z=8 and sitting on y=0.`;

export default function AIHelpModal({ onClose, onOpenImport }: Props) {
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this prompt:", PROMPT_TEMPLATE);
    }
  };

  return (
    <Modal title="GENERATE WITH AI" onClose={onClose}>
      <div className={S.note}>
        Ask any AI chatbot (Claude, ChatGPT, Gemini…) to build a model for you:
        copy the prompt below, swap "a small sailboat" for whatever you want,
        paste the AI's answer into Import, and it appears here — ready to edit
        and export.
      </div>
      <div className={S.code}>{PROMPT_TEMPLATE}</div>
      <div className={S.rowEnd}>
        <button className={A.btnActive} onClick={copyPrompt}>
          {copied ? "Copied!" : "Copy prompt"}
        </button>
        <button
          className={A.btn}
          onClick={() => {
            onClose();
            onOpenImport();
          }}
        >
          Open Import
        </button>
      </div>
      <div className={S.note}>The model format, if you want to write it by hand:</div>
      <div className={S.code}>
        {'{ "size": 16, "voxels": [ { "x": 8, "y": 0, "z": 8, "c": 0 }, … ] }'}
        {"\n"}x, y, z: integers 0–15 (y is up) · c: palette index below
      </div>
      <table className={S.schemaTable}>
        <thead>
          <tr>
            <th>c</th>
            <th>Color</th>
            <th>Hex</th>
          </tr>
        </thead>
        <tbody>
          {PALETTE.map((p, i) => (
            <tr key={p.name}>
              <td>{i}</td>
              <td>
                <span className={S.chip} style={{ background: p.hex }} />
                {p.name}
              </td>
              <td>{p.hex}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={S.rowEnd}>
        <button className={A.btn} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
