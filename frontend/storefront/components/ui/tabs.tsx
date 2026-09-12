"use client";

import { createContext, ReactNode, useContext, useState } from "react";

const TabsContext = createContext<{ value: string; setValue: (v: string) => void }>({
  value: "",
  setValue: () => {},
});

export function Tabs({
  defaultValue,
  children,
  className = "",
}: {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}>{ <div className={className}>{children}</div> }</TabsContext.Provider>;
}

export function TabsList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="tablist" className={`flex gap-1 border-b border-zinc-200 ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const { value: active, setValue } = useContext(TabsContext);
  const selected = active === value;
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={() => setValue(value)}
      className={`-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-semibold ${
        selected
          ? "border-zinc-950 text-zinc-950"
          : "border-transparent text-zinc-500 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  const { value: active } = useContext(TabsContext);
  if (active !== value) return null;
  return <div role="tabpanel" className="pt-6">{children}</div>;
}
