import { cn } from "@/lib/utils";
import { useState } from "react";

interface LeverSwitchProps {
  disabled?: boolean;
  onToggle?: (checked: boolean) => void;
  className?: string;
}

export const LeverSwitch = ({ disabled = false, onToggle, className }: LeverSwitchProps) => {
  const [checked, setChecked] = useState(false);

  const handleChange = () => {
    if (disabled) return;
    const next = !checked;
    setChecked(next);
    onToggle?.(next);
  };

  return (
    <div className={cn("toggle-container", disabled && "toggle-disabled", className)}>
      <input
        className="toggle-input"
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />
      {/* Base/socket at the TOP (mount point) */}
      <div className="toggle-base" onClick={handleChange}>
        <div className="toggle-base-inside"></div>
      </div>
      {/* Handle hangs below — bar then knob */}
      <div className="toggle-handle-wrapper" onClick={handleChange}>
        <div className="toggle-handle">
          <div className="toggle-handle-bar-wrapper">
            <div className="toggle-handle-bar"></div>
          </div>
          <div className="toggle-handle-knob"></div>
        </div>
      </div>
    </div>
  );
};
