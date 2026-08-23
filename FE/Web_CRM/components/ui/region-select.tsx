"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getRegions } from "@/lib/api/regions";

type RegionSelectProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
};

let cachedRegions: string[] | null = null;
let regionsPromise: Promise<string[]> | null = null;

async function loadRegions(): Promise<string[]> {
  if (cachedRegions) return cachedRegions;
  if (!regionsPromise) {
    regionsPromise = getRegions()
      .then((regions) => {
        cachedRegions = regions;
        return regions;
      })
      .catch((err) => {
        regionsPromise = null;
        throw err;
      });
  }
  return regionsPromise;
}

export function RegionSelect({
  value,
  onChange,
  id,
  placeholder = "Chọn khu vực",
  disabled,
}: RegionSelectProps) {
  const [regions, setRegions] = useState<string[]>(cachedRegions ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedRegions) {
      setRegions(cachedRegions);
      return;
    }
    let cancelled = false;
    loadRegions()
      .then((list) => {
        if (!cancelled) setRegions(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được danh sách khu vực");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(
    () => regions.map((r) => ({ value: r, label: r })),
    [regions]
  );

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  return (
    <SearchableSelect
      id={id}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Tìm tỉnh thành..."
      emptyText="Không tìm thấy khu vực phù hợp"
      clearable
      disabled={disabled}
    />
  );
}
