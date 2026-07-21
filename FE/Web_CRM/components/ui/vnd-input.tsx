"use client";

import { Input } from "@/components/ui/input";
import { formatVndInput, parseVndInput, cn } from "@/lib/utils";

type VndInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value: number | "";
  onValueChange: (value: number | "") => void;
};

/** Money input that always displays Vietnamese grouping: 1.000, 10.000, ... */
export function VndInput({
  value,
  onValueChange,
  className,
  ...props
}: VndInputProps) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      autoComplete="off"
      className={cn("tabular-nums", className)}
      value={formatVndInput(value)}
      onChange={(event) => onValueChange(parseVndInput(event.target.value))}
    />
  );
}
