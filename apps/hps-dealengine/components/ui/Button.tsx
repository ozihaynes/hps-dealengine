import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className = "",
  children,
  disabled,
  ...props
}) => {
  const variantClass =
    variant === "danger"
      ? "btn-danger"
      : variant === "ghost"
      ? "btn-ghost"
      : variant === "success"
      ? "btn-success"
      : variant === "secondary"
      ? "btn-secondary"
      : "btn-primary";

  const sizeClass =
    size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : size === "xl" ? "btn-xl" : "";

  const loadingClass = loading ? "btn-loading" : "";

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${loadingClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {icon && !loading ? <span className="btn-icon">{icon}</span> : null}
      {!loading ? children : null}
    </button>
  );
};
