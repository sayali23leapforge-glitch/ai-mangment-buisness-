import "../styles/Toggle.css";

interface ToggleSwitchProps {
  leftLabel: string;
  rightLabel: string;
  isRight: boolean;
  onChange: (isRight: boolean) => void;
  leftColor?: string;
  rightColor?: string;
}

export function ToggleSwitch({
  leftLabel,
  rightLabel,
  isRight,
  onChange,
  leftColor = "#10b981",
  rightColor = "#3b82f6"
}: ToggleSwitchProps) {
  return (
    <div className="toggle-switch-wrapper">
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={isRight}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={`Toggle between ${leftLabel} and ${rightLabel}`}
        />
        <span 
          className="toggle-slider"
          style={{
            "--toggle-left-color": leftColor,
            "--toggle-right-color": rightColor,
          } as React.CSSProperties}
        />
        <span className="toggle-label-left">{leftLabel}</span>
        <span className="toggle-label-right">{rightLabel}</span>
      </label>
    </div>
  );
}
