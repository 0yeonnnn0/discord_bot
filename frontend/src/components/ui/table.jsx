import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }) {
  return (
    <div
      data-slot="table-container"
      className={cn("toro-table-wrap", className)}
    >
      <table data-slot="table" className="toro-table" {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return <thead data-slot="table-header" className={cn("toro-thead", className)} {...props} />;
}

function TableBody({ className, ...props }) {
  return <tbody data-slot="table-body" className={cn("toro-tbody", className)} {...props} />;
}

function TableFooter({ className, ...props }) {
  return <tfoot data-slot="table-footer" className={cn("toro-tfoot", className)} {...props} />;
}

function TableRow({ className, ...props }) {
  return <tr data-slot="table-row" className={cn("toro-tr", className)} {...props} />;
}

function TableHead({ className, ...props }) {
  return <th data-slot="table-head" className={cn("toro-th", className)} {...props} />;
}

function TableCell({ className, ...props }) {
  return <td data-slot="table-cell" className={cn("toro-td", className)} {...props} />;
}

function TableCaption({ className, ...props }) {
  return <caption data-slot="table-caption" className={cn("toro-caption", className)} {...props} />;
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
