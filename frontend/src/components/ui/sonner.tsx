import React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={{
        "--normal-bg": "#16213e",
        "--normal-text": "#e0e0e0",
        "--normal-border": "#2a2a4a",
        "--success-bg": "#16213e",
        "--success-text": "#43b581",
        "--error-bg": "#16213e",
        "--error-text": "#f04747",
      } as React.CSSProperties}
      {...props}
    />
  );
}

export { Toaster }
