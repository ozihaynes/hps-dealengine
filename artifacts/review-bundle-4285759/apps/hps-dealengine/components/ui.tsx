import React, { useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import type {
  IconProps,
  CardProps,
  BadgeProps,
  ButtonProps,
  InputFieldProps,
  SelectFieldProps,
  ToggleSwitchProps,
  TabsContextType,
  ModalProps,
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
    <path d={d} />
  </svg>
);

export const GlassCard = ({ children, className = '' }: CardProps) => (
  <div
    className={cn(
      'card-primary card-padding-md hover-lift text-[color:var(--text-primary)]',
      className
    )}
    style={{ color: 'var(--text-primary)' }}
  >
    {children}
  </div>
);

export const Badge = ({
  color,
  children,
  className = '',
  dataTestId,
  ...rest
}: BadgeProps) => {
  const colors = {
    green: 'border border-[color:var(--accent-green)]/40 bg-[color:var(--accent-green)]/15 text-[color:var(--text-primary)]',
    blue: 'border border-[color:var(--accent-color)]/35 bg-[color:var(--accent-color)]/15 text-[color:var(--text-primary)]',
    orange: 'bg-accent-orange-subtle text-accent-orange-light border border-accent-orange-subtle',
    red: 'bg-brand-red-subtle text-brand-red-light border border-brand-red-subtle',
  };
  const colorClass = color ? colors[color] : colors.blue;
  return (
    <span
      data-testid={dataTestId}
      {...rest}
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass} ${className}`}
    >
      {children}
    </span>
  );
};

export const Button = ({
  children,
  onClick,
  size = 'md',
  variant = 'primary',
  className = '',
  title,
  disabled = false,
  dataTestId,
}: ButtonProps) => {
  const sizeClass =
    ({ sm: 'btn-sm', md: '', lg: 'btn-lg', xl: 'btn-xl' } as Record<string, string>)[
      size as string
    ] || '';
  const variantClass =
    ({
      primary: 'btn-primary',
      danger: 'btn-danger',
      ghost: 'btn-ghost',
      success: 'btn-success',
      neutral: 'btn-secondary',
      secondary: 'btn-secondary',
    } as Record<string, string>)[variant as string] || 'btn-primary';
  return (
    <button
      className={cn('btn', variantClass, sizeClass, className)}
      onClick={onClick}
      title={title}
      disabled={disabled}
      data-testid={dataTestId}
    >
      {children}
    </button>
  );
};

export const InputField = ({
  label,
  type = 'text',
  value,
  onChange,
  prefix,
  suffix,
  description,
  warning,
  helpKey,
  dataTestId,
  ...props
}: InputFieldProps) => {
  const isNumber = type === 'number';
  const { className, ...inputProps } = props as any;
  const placeholderValue = isNumber
    ? (props as any)?.placeholder ?? '0'
    : (props as any)?.placeholder;

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
        <label className="block text-base font-medium text-text-primary">{label}</label>
        {helpKey ? <InfoTooltip helpKey={helpKey} /> : null}
      </div>
      {description && <p className="text-xs text-text-secondary/70 mb-2">{description}</p>}
      <div className={`input-wrapper ${prefix ? 'has-prefix' : ''} ${suffix ? 'has-suffix' : ''}`}>
        {prefix && <span className="input-prefix">{prefix}</span>}
        {isNumber ? (
          <NumericInput
            data-testid={dataTestId}
            value={numericValue}
            placeholder={placeholderValue}
            onValueChange={(next) => {
              if (!onChange) return;
              const synthetic = {
                target: {
                  value: next === null ? null : String(next),
                },
              };
              onChange(synthetic as any);
            }}
            className={cn(warning ? 'input-error' : '', className)}
            {...inputProps}
          />
        ) : (
          <input
            type={type}
            data-testid={dataTestId}
            value={value}
            placeholder={placeholderValue}
            onChange={(e) => {
              onChange?.(e);
            }}
            className={cn('input-base', warning ? 'input-error' : '', className)}
            {...inputProps}
          />
        )}
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {warning ? <p className="input-error-message mt-1 flex items-center gap-1"><Icon d={Icons.alert} size={16} className="text-accent-orange" />{warning}</p> : null}
    </div>
  );
};

export const SelectField = ({
  label,
  value,
  onChange,
  children,
  className,
  description,
  helpKey,
  dataTestId,
}: SelectFieldProps) => (
  <div className={className}>
    <div className="mb-1 flex items-center gap-2">
      <label className="block text-base font-medium text-text-primary">{label}</label>
      {helpKey ? <InfoTooltip helpKey={helpKey} /> : null}
    </div>
    {description && <p className="text-xs text-text-secondary/70 mb-2">{description}</p>}
    <select value={value} onChange={onChange} className="input-base" data-testid={dataTestId}>
      {children}
    </select>
  </div>
);

export const ToggleSwitch = ({ label, checked, onChange, description }: ToggleSwitchProps) => (
  <label className="flex items-start justify-between cursor-pointer">
    <div className="pr-4">
      <span className="text-sm text-text-primary">{label}</span>
      {description && <p className="text-xs text-text-secondary/70 mt-1">{description}</p>}
    </div>
    <div className="relative shrink-0 mt-1">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <div
        className={cn(
          'block w-10 h-6 rounded-full transition-colors border',
          checked ? 'bg-accent-blue/80 border-accent-blue/70' : 'bg-gray-700 border-white/20'
        )}
      ></div>
      <div
        className={cn(
          'dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ring-1 ring-black/10',
          checked ? 'transform translate-x-4' : ''
        )}
      ></div>
    </div>
  </label>
);

const TabsContext = createContext<TabsContextType>({ activeTab: '', setActiveTab: () => {} });

// children optional to avoid TS noise in your config
export const NestedTabs = ({
  children,
  initialTab,
}: {
  children?: ReactNode;
  initialTab: string;
}) => {
  const [activeTab, setActiveTab] = React.useState(initialTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>{children}</TabsContext.Provider>
  );
};

export const NestedTabsList = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;

export const NestedTabsTrigger = ({
  children,
  value,
  className,
}: {
  children?: ReactNode;
  value: string;
  className?: string;
}) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <button
      onClick={() => setActiveTab && setActiveTab(value)}
      className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
        isActive
          ? 'text-text-primary border-accent-blue shadow-[0_4px_12px_-4px_var(--accent-blue)]'
          : 'text-text-secondary border-transparent hover:text-text-primary'
      } ${className}`}
    >
      {children}
    </button>
  );
};

export const NestedTabsContent = ({ value, children }: { value: string; children?: ReactNode }) => {
  const { activeTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <div
      className={`transition-opacity ${isActive ? 'animate-fade-in' : 'animate-fade-out'} ${
        isActive ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
      }`}
    >
      {children}
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  const safeTitle = title ?? '';
  const titleId = safeTitle.replace(/\s+/g, '-').toLowerCase();

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`card-primary card-padding-lg hover-lift w-full m-4 ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3">
          <h3 id={titleId} className="text-lg font-bold text-text-primary">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="mt-4">{children}</div>
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
    const newSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
      {description && <p className="text-xs text-text-secondary/70 mb-2">{description}</p>}
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
    const newData = [...data];
    newData[rowIndex][key] = value;
    onChange(newData);
  };
  const handleAdd = () => onChange([...data, { ...newRowDefaults, id: Date.now() }]);
  const handleRemove = (rowIndex: number) => onChange(data.filter((_, i) => i !== rowIndex));

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1">
        <div>
          <label className="block text-sm font-medium text-text-primary">{label}</label>
          {description && <p className="text-xs text-text-secondary/70 mt-1">{description}</p>}
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
              <th className="w-[60px]"></th>
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
                        onChange={(e) => handleUpdate(rowIndex, col.key, e.target.value)}
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
                            col.type === 'number' ? num(e.target.value) : e.target.value
                          )
                        }
                        className="input-base input-sm"
                      />
                    )}
                  </td>
                ))}
                <td className="p-1 text-center">
                  <Button size="sm" variant="danger" onClick={() => handleRemove(rowIndex)}>
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
