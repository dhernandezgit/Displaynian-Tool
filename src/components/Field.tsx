import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export function Section({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`section ${open ? "is-open" : ""}`}>
      <button className="section-head" type="button" onClick={() => setOpen((value) => !value)}>
        <span className="section-icon">{icon}</span>
        <span className="section-title">
          <strong>{title}</strong>
          {subtitle ? <small>{subtitle}</small> : null}
        </span>
        <ChevronDown size={16} className="section-chevron" />
      </button>
      {open ? <div className="section-body">{children}</div> : null}
    </section>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 1,
  unit = "mm",
  hint,
  slider = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
  slider?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </span>
      <span className="field-control">
        {slider ? (
          <input
            className="range"
            type="range"
            min={min}
            max={max}
            step={step}
            value={Number(value)}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        ) : null}
        <span className="number-box">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(Number(value)) ? Number(value) : 0}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          {unit ? <em>{unit}</em> : null}
        </span>
      </span>
    </label>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </span>
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? "is-active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Menos">
        −
      </button>
      <b>{value}</b>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="Más">
        +
      </button>
    </span>
  );
}
