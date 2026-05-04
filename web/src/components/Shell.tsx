import type { ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <>
      {/* Desktop: sidebar + main */}
      <div className="hidden md:flex h-screen">
        <aside
          className="flex flex-col border-r h-full shrink-0"
          style={{
            width: "17rem",
            borderColor: "var(--color-line)",
            background: "var(--color-panel)",
          }}
        >
          <div className="p-6 font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>
            weather
          </div>
          <nav className="flex-1 px-4">
            {/* Add nav items here */}
          </nav>
          <div className="p-4 text-xs" style={{ color: "var(--color-muted)" }}>
            <a
              href="https://freeappstore.online"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "var(--color-muted)" }}
            >
              Part of FreeAppStore — free forever
            </a>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>

      {/* Mobile: header + main + dock */}
      <div className="flex flex-col h-screen md:hidden">
        <header
          className="flex items-center px-4 h-14 border-b shrink-0"
          style={{ borderColor: "var(--color-line)", background: "var(--color-panel)" }}
        >
          <span className="font-bold" style={{ fontFamily: "var(--font-display)" }}>
            weather
          </span>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </>
  );
}
