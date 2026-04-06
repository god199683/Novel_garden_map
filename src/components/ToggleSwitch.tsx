"use client";

interface ToggleSwitchProps {
  active: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}

export default function ToggleSwitch({ active, onChange, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-foreground/50 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!active)}
        className={`toggle-switch ${active ? "active" : ""}`}
        aria-label={label}
      />
    </div>
  );
}
