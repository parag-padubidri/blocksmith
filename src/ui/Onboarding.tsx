import { useState } from "react";
import S from "./Onboarding.module.css";
import A from "./App.module.css";

const STEPS = [
  { icon: "👆", text: "Tap a face or the ground to place a block." },
  { icon: "🔄", text: "Drag to spin around your model. Pinch or scroll to zoom." },
  { icon: "🎨", text: "Pick colors below — plus Break and Paint tools." },
];

export const ONBOARDED_KEY = "bs_onboarded";

interface Props {
  onDone: () => void;
}

export default function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(0);

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // private mode — it'll just show again next time
    }
    onDone();
  };

  const last = step === STEPS.length - 1;

  return (
    <div className={S.wrap} role="dialog" aria-label="Welcome tour">
      <div className={S.card}>
        <div className={S.icon} aria-hidden="true">
          {STEPS[step].icon}
        </div>
        <div className={S.text}>{STEPS[step].text}</div>
        <div className={S.controls}>
          <span className={S.dots}>
            {STEPS.map((_s, i) => (
              <span key={i} className={i === step ? S.dotOn : S.dot} />
            ))}
          </span>
          <button className={A.btn} onClick={finish}>
            Skip
          </button>
          <button
            className={A.btnActive}
            onClick={() => (last ? finish() : setStep(step + 1))}
          >
            {last ? "Let's build!" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
