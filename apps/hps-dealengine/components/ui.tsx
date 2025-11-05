"use client";
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
  <div className={`card-icy ${className}`}>{children}</div>
);

export const Badge = ({ color, children }: BadgeProps) => {
  const colors = {
    green: 'bg-green-500/20 text-green-300 border border-green-500/30',
    blue: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    orange: 'bg-accent-orange-subtle text-accent-orange-light border border-accent-orange-subtle',
    red: 'bg-brand-red-subtle text-brand-red-light border border-brand-red-subtle',
  };
  const colorClass = color ? colors[color] : colors.blue;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
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
  disabled = false,
}: ButtonProps) => {
  const sizes = { sm: 'px-2 py-1 text-xs', md: 'px-4 py-2 text-sm' };
  const variants = {
    primary:
      'bg-accent-blue text-white hover:bg-blue-500 disabled:bg-blue-500/50 disabled:cursor-not-allowed',
    danger:
      'bg-accent-red text-white hover:bg-red-700 disabled:bg-red-500/50 disabled:cursor-not-allowed',
    ghost:
      'text-accent-blue/80 hover:bg-accent-blue/10 hover:text-accent-blue disabled:text-accent-blue/50 disabled:cursor-not-allowed',
    neutral:
      'bg-gray-500/20 hover:bg-gray-500/30 text-text-primary disabled:bg-gray-500/10 disabled:text-text-primary/50 disabled:cursor-not-allowed',
  };
  return (
    <button
      className={`font-semibold rounded-md transition-colors ${sizes[size]} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
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
  ...props
}: InputFieldProps) => (
  <div className="relative">
    <label className="block text-base font-medium text-text-primary mb-1">{label}</label>
    {description && <p className="text-xs text-text-secondary/70 mb-2">{description}</p>}
    <div className="relative">
      {prefix && (
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm text-text-secondary/70 pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={`dark-input ${prefix ? 'prefixed' : ''} ${suffix || warning ? 'pr-12' : ''} ${warning ? 'border-accent-orange' : ''}`}
        {...props}
      />
      {suffix && !warning && (
        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-text-secondary/70 pointer-events-none">
          {suffix}
        </span>
      )}
      {warning && (
        <div
          tabIndex={0}
          className="absolute inset-y-0 right-0 pr-3 flex items-center group outline-none"
        >
          <Icon d={Icons.alert} size={16} className="text-accent-orange" />
          <div className="invisible group-hover:visible group-focus:visible absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-900 text-gray-100 text-xs rounded-md shadow-lg z-10">
            {warning}
            <div className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  </div>
);

export const SelectField = ({
  label,
  value,
  onChange,
  children,
  className,
  description,
}: SelectFieldProps) => (
  <div className={className}>
    <label className="block text-base font-medium text-text-primary mb-1">{label}</label>
    {description && <p className="text-xs text-text-secondary/70 mb-2">{description}</p>}
    <select value={value} onChange={onChange} className="dark-select">
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
    <div className="relative flex-shrink-0 mt-1">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <div
        className={`block w-10 h-6 rounded-full ${checked ? 'bg-accent-blue' : 'bg-gray-600'}`}
      ></div>
      <div
        className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}
      ></div>
    </div>
  </label>
);

const TabsContext = createContext<TabsContextType>({ activeTab: '', setActiveTab: () => {} });

// FIX: Made children optional to resolve a TypeScript error that appears to be from a configuration issue.
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
// FIX: Made children optional to resolve a TypeScript error that appears to be from a configuration issue.
export const NestedTabsList = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
// FIX: Made children optional to resolve a TypeScript error that appears to be from a configuration issue.
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
      onClick={() => setActiveTab(value)}
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
// FIX: Made children optional to resolve a TypeScript error that appears to be from a configuration issue.
export const NestedTabsContent = ({ value, children }: { value: string; children?: ReactNode }) => {
  const { activeTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <div
      className={`transition-opacity duration-300 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}
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
  const titleId = title.replace(/\s+/g, '-').toLowerCase();

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`card-icy w-full m-4 ${sizeClasses[size]}`}
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
                        className="dark-select text-xs py-1"
                      >
                        {col.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      // FIX: The second argument to `num` must be a number. Changed `num(e.target.value, '')` to `num(e.target.value)` to use the default fallback.
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
                        className="dark-input text-xs py-1"
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

