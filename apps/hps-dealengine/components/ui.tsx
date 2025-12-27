import React, { useContext, createContext, useId } from 'react';
import type { ReactNode } from 'react';
import type {
  IconProps,
  InputFieldProps,
  SelectFieldProps,
  ToggleSwitchProps,
  MultiSelectChecklistProps,
  DynamicBandEditorProps,
} from '../types';
import { num } from '../utils/helpers';
import { Icons } from '../constants';
import { InfoTooltip } from './ui/InfoTooltip';
import NumericInput from './ui/NumericInput';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const Icon = ({ d, size = 20, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {d ? <path d={d} /> : null}
  </svg>
);

export const InputField = ({
  label,
  type = 'text',
  value,
  prefix,
  suffix,
  description,
  onChange,
  helpKey,
  warning,
  dataTestId,
  ...props
}: InputFieldProps) => {
  const isNumber = type === 'number';
  const generatedId = useId();

  const {
    className,
    placeholder: placeholderProp,
    id: idProp,
    ...inputProps
  } = props as any;

  const safeTestId =
    typeof dataTestId === 'string'
      ? dataTestId.replace(/[^A-Za-z0-9\-_:.]/g, '-')
      : undefined;

  const inputId = idProp ?? (safeTestId ? `${safeTestId}-input` : generatedId);
  const descriptionId = description ? `${inputId}-description` : undefined;
  const warningId = warning ? `${inputId}-warning` : undefined;
  const ariaDescribedBy =
    [descriptionId, warningId].filter(Boolean).join(' ') || undefined;

  const placeholderValue = isNumber ? placeholderProp ?? '0' : placeholderProp;

  const numericValue = (() => {
    if (!isNumber) return null;
    if (value === null || value === undefined || value === '') return null;
    const cleaned =
      typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  })();

  return (
    <div className="relative">
      <div className="mb-1 flex items-center gap-2">
        <label
          htmlFor={inputId}
          className="block text-base font-medium text-text-primary"
        >
          {label}
        </label>
        {helpKey ? <InfoTooltip helpKey={helpKey} /> : null}
      </div>

      {description ? (
        <p id={descriptionId} className="text-xs text-text-secondary/70 mb-2">
          {description}
        </p>
      ) : null}

      <div
        className={`input-wrapper ${prefix ? 'has-prefix' : ''} ${
          suffix ? 'has-suffix' : ''
        }`}
      >
        {prefix ? <span className="input-prefix">{prefix}</span> : null}

        {isNumber ? (
          <NumericInput
            id={inputId}
            data-testid={dataTestId}
            aria-invalid={warning ? true : undefined}
            aria-describedby={ariaDescribedBy}
            value={numericValue}
            placeholder={placeholderValue}
            onValueChange={(next) => {
              if (!onChange) return;
              // DOM input values are strings; represent "null" as empty string.
              const nextValue = next === null ? '' : String(next);
              const synthetic = {
                target: { value: nextValue },
                currentTarget: { value: nextValue },
              };
              onChange(synthetic as any);
            }}
            className={cn(warning ? 'input-error' : '', className)}
            {...inputProps}
          />
        ) : (
          <input
            id={inputId}
            type={type}
            data-testid={dataTestId}
            aria-invalid={warning ? true : undefined}
            aria-describedby={ariaDescribedBy}
            value={value ?? ''}
            placeholder={placeholderValue}
            onChange={(e) => {
              onChange?.(e);
            }}
            className={cn('input-base', warning ? 'input-error' : '', className)}
            {...inputProps}
          />
        )}

        {suffix ? <span className="input-suffix">{suffix}</span> : null}
      </div>

      {warning ? (
        <p
          id={warningId}
          className="input-error-message mt-1 flex items-center gap-1"
        >
          <Icon d={Icons.alert} size={16} className="text-accent-orange" />
          {warning}
        </p>
      ) : null}
    </div>
  );
};

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  dataTestId,
  helpKey,
  warning,
  description,
  children,
  className,
  disabled,
  ...props
}: SelectFieldProps) => {
  const generatedId = useId();
  const { id: idProp, ...selectProps } = props as any;

  const safeTestId =
    typeof dataTestId === 'string'
      ? dataTestId.replace(/[^A-Za-z0-9\-_:.]/g, '-')
      : undefined;

  const selectId =
    idProp ?? (safeTestId ? `${safeTestId}-select` : generatedId);
  const descriptionId = description ? `${selectId}-description` : undefined;
  const warningId = warning ? `${selectId}-warning` : undefined;
  const ariaDescribedBy =
    [descriptionId, warningId].filter(Boolean).join(' ') || undefined;

  const renderedOptions =
    children ??
    options?.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ));

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        {label ? (
          <label
            htmlFor={selectId}
            className="block text-base font-medium text-text-primary"
          >
            {label}
          </label>
        ) : null}
        {helpKey ? <InfoTooltip helpKey={helpKey} /> : null}
      </div>
      {description ? (
        <p id={descriptionId} className="text-xs text-text-secondary/70 mb-2">
          {description}
        </p>
      ) : null}
      <select
        id={selectId}
        data-testid={dataTestId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={warning ? true : undefined}
        aria-describedby={ariaDescribedBy}
        className={cn('input-base', warning ? 'input-error' : '', className)}
        {...selectProps}
      >
        {renderedOptions}
      </select>
      {warning ? (
        <p id={warningId} className="input-error-message mt-1 flex items-center gap-1">
          <Icon d={Icons.alert} size={16} className="text-accent-orange" />
          {warning}
        </p>
      ) : null}
    </div>
  );
};

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "neutral";

export const Button = ({
  children,
  onClick,
  disabled,
  className = '',
  size = 'md',
  type = 'button',
  variant,
  title,
  dataTestId,
}: {
  children: ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
  title?: string;
  dataTestId?: string;
}) => {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  };
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-[color:var(--accent-color)] text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-secondary)]',
    secondary:
      'border border-border/40 bg-white/10 text-text-primary hover:bg-white/15',
    neutral:
      'border border-border/40 bg-white/5 text-text-secondary hover:bg-white/10',
    ghost: 'bg-transparent text-text-secondary hover:bg-white/10',
    danger: 'border border-red-500/30 bg-red-500/20 text-red-200 hover:bg-red-500/30',
  };
  const variantClass = variant ? variants[variant] ?? '' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-testid={dataTestId}
      className={`${base} ${sizes[size]} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
};

export const GlassCard = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`glass-card ${className}`}>{children}</div>
);

export const Badge = ({
  children,
  className = '',
  color,
  dataTestId,
}: {
  children: ReactNode;
  className?: string;
  color?: 'green' | 'blue' | 'orange' | 'red';
  dataTestId?: string;
}) => {
  const colors: Record<NonNullable<typeof color>, string> = {
    green: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/20',
    blue: 'bg-blue-500/20 text-blue-200 border-blue-400/20',
    orange: 'bg-amber-500/20 text-amber-200 border-amber-400/20',
    red: 'bg-red-500/20 text-red-200 border-red-400/20',
  };
  const colorClass = color ? colors[color] : 'bg-white/10 text-text-primary border-white/10';

  return (
    <span
      data-testid={dataTestId}
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${colorClass} ${className}`}
    >
      {children}
    </span>
  );
};

export const Pill = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-text-primary ${className}`}
  >
    {children}
  </span>
);

export const Modal = ({
  open,
  isOpen,
  title,
  children,
  onClose,
  actions,
  className = '',
  size = 'md',
}: {
  open?: boolean;
  isOpen?: boolean;
  title: string;
  children: ReactNode;
  onClose?: () => void;
  actions?: ReactNode;
  className?: string;
  size?: 'md' | 'lg' | 'xl';
}) => {
  const resolvedOpen = typeof open === 'boolean' ? open : Boolean(isOpen);
  if (!resolvedOpen) return null;

  const safeTitle =
    typeof title === 'string' && title.trim().length > 0 ? title.trim() : 'Modal';
  const titleId = `modal-title-${safeTitle.replace(/\s+/g, '-')}`;
  const sizeClasses: Record<'md' | 'lg' | 'xl', string> = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  const handleClose = onClose ?? (() => {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div
        className={`relative z-10 w-full ${sizeClasses[size] ?? sizeClasses.md} rounded-xl border border-white/10 bg-surface-elevated/80 p-5 shadow-xl backdrop-blur ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-text-primary">
            {safeTitle}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-text-secondary hover:bg-white/10 hover:text-text-primary"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">{children}</div>

        {actions ? (
          <div className="mt-5 flex items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const MultiSelectChecklist = ({
  label,
  options,
  selected,
  onChange,
  className,
  description,
}: MultiSelectChecklistProps) => {
  const handleToggle = (option: string) => {
    const nextSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    onChange(nextSelected);
  };

  return (
    <div className={className}>
      {label ? (
        <label className="block text-sm font-medium text-text-primary mb-1">
          {label}
        </label>
      ) : null}
      {description ? (
        <p className="text-xs text-text-secondary/70 mb-2">{description}</p>
      ) : null}
      <div className="info-card p-2 space-y-1">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => handleToggle(option)}
              className="h-4 w-4 rounded bg-accent-blue/40 border-accent-blue/50 text-accent-blue focus:ring-accent-blue"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
};

export const DynamicBandEditor = ({
  label,
  columns,
  data = [],
  onChange,
  newRowDefaults,
  className,
  description,
}: DynamicBandEditorProps) => {
  const handleUpdate = (rowIndex: number, key: string, value: any) => {
    const next = [...data];
    next[rowIndex][key] = value;
    onChange(next);
  };

  const handleAdd = () =>
    onChange([...data, { ...newRowDefaults, id: Date.now() }]);

  const handleRemove = (rowIndex: number) =>
    onChange(data.filter((_, i) => i !== rowIndex));

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1">
        <div>
          {label ? (
            <label className="block text-sm font-medium text-text-primary">
              {label}
            </label>
          ) : null}
          {description ? (
            <p className="text-xs text-text-secondary/70 mt-1">{description}</p>
          ) : null}
        </div>
        <Button size="sm" variant="ghost" onClick={handleAdd}>
          + Add Row
        </Button>
      </div>
      <div className="overflow-x-auto info-card p-1 mt-2">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="p-2 text-left label-xs">
                  {col.label}
                </th>
              ))}
              <th className="w-[60px]" />
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                {columns.map((col) => (
                  <td key={col.key} className="p-1">
                    {col.type === 'select' ? (
                      <select
                        value={row[col.key] || ''}
                        onChange={(e) =>
                          handleUpdate(rowIndex, col.key, e.target.value)
                        }
                        className="input-base input-sm"
                      >
                        {col.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={col.type}
                        value={row[col.key] || ''}
                        onChange={(e) =>
                          handleUpdate(
                            rowIndex,
                            col.key,
                            col.type === 'number'
                              ? num(e.target.value)
                              : e.target.value
                          )
                        }
                        className="input-base input-sm"
                      />
                    )}
                  </td>
                ))}
                <td className="p-1 text-center">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemove(rowIndex)}
                  >
                    &times;
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const Divider = ({ className = '' }: { className?: string }) => (
  <div className={`my-4 h-px w-full bg-white/10 ${className}`} />
);

export const SectionTitle = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <h3 className={`text-lg font-semibold text-text-primary ${className}`}>
    {children}
  </h3>
);

export const SubtleText = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => <p className={`text-sm text-text-secondary ${className}`}>{children}</p>;

export const InlineStat = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) => (
  <div className={`flex items-center justify-between gap-3 ${className}`}>
    <span className="text-sm text-text-secondary">{label}</span>
    <span className="text-sm font-medium text-text-primary">{value}</span>
  </div>
);

export const ProgressBar = ({
  value,
  max = 100,
  className = '',
}: {
  value: number;
  max?: number;
  className?: string;
}) => {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`h-2 w-full rounded-full bg-white/10 ${className}`}>
      <div
        className="h-2 rounded-full bg-white/40"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

export const KpiTile = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) => (
  <div className="rounded-lg border border-white/5 bg-white/5 p-3">
    <div className="text-xs text-text-secondary">{label}</div>
    <div className="mt-1 text-lg font-semibold text-text-primary">{value}</div>
    {hint ? <div className="mt-1 text-xs text-text-secondary">{hint}</div> : null}
  </div>
);

export const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) => (
  <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
    <span>{label}</span>
    <button
      type="button"
      className={`relative inline-flex h-5 w-9 items-center rounded-full border border-white/10 transition-colors ${
        checked ? 'bg-white/30' : 'bg-white/10'
      }`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  </label>
);

export const ToggleSwitch = ({
  checked = false,
  onChange,
  label,
  description,
  className = '',
}: ToggleSwitchProps & { className?: string }) => (
  <label className={cn('flex items-start justify-between gap-3', className)}>
    <span>
      <span className="text-sm text-text-primary">{label}</span>
      {description ? (
        <span className="mt-1 block text-xs text-text-secondary/70">
          {description}
        </span>
      ) : null}
    </span>
    <span
      className={`relative mt-1 inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
        checked ? 'bg-white/30 border-white/40' : 'bg-white/10 border-white/10'
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </span>
  </label>
);

export const StatusChip = ({
  status,
}: {
  status: string | null | undefined;
}) => {
  const s = (status ?? '').toString().toLowerCase();
  const text =
    s === 'readyforoffer' || s === 'ready'
      ? 'Ready'
      : s === 'review'
        ? 'Review'
        : s === 'fail'
          ? 'Fail'
          : s || '-';

  const cls =
    s === 'readyforoffer' || s === 'ready'
      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/20'
      : s === 'review'
        ? 'bg-amber-500/20 text-amber-200 border-amber-400/20'
        : s === 'fail'
          ? 'bg-red-500/20 text-red-200 border-red-400/20'
          : 'bg-white/10 text-text-secondary border-white/10';

  return (
    <span
      data-testid="workflow-pill"
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {text}
    </span>
  );
};

export const Checkbox = ({
  checked,
  onChange,
  label,
  className = '',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  className?: string;
}) => (
  <label className={`flex cursor-pointer items-start gap-2 ${className}`}>
    <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border border-white/20 bg-white/5">
      {checked ? <Icon d={Icons.check} size={12} className="text-white" /> : null}
    </span>
    <input
      type="checkbox"
      className="sr-only"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="text-sm text-text-primary">{label}</span>
  </label>
);

export const TabsContext = createContext<{
  value: string;
  setValue: (v: string) => void;
} | null>(null);

export const Tabs = ({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
}) => {
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabList = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
    {children}
  </div>
);

export const Tab = ({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) => {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-white/10 text-text-primary'
          : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
      }`}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  );
};

export const TabPanel = ({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) => {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  if (ctx.value !== value) return null;
  return <div className="mt-3">{children}</div>;
};

export const Table = ({
  header,
  rows,
  footer,
}: {
  header: ReactNode;
  rows: ReactNode;
  footer?: ReactNode;
}) => (
  <div className="overflow-hidden rounded-xl border border-white/10">
    <table className="w-full">
      <thead className="bg-white/5 text-left text-xs text-text-secondary">
        {header}
      </thead>
      <tbody className="divide-y divide-white/5">{rows}</tbody>
      {footer ? (
        <tfoot className="bg-white/5 text-left text-xs text-text-secondary">
          {footer}
        </tfoot>
      ) : null}
    </table>
  </div>
);

export const Money = ({ value }: { value: any }) => {
  const n = num(value);
  const formatted =
    !Number.isFinite(n) || n === 0
      ? '—'
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(n);

  return <span className="text-numeric">{formatted}</span>;
};
