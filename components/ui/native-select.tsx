import * as React from "react";

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className = "", children, onChange, ...props }, ref) => {
    return (
      <select
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        onChange={onChange}
        {...props}
      >
        {children}
      </select>
    );
  }
);

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
