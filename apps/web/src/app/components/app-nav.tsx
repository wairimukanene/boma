"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const modules = [
  { href: "/bills", label: "Bills" },
  { href: "/tasks", label: "Tasks" },
  { href: "#", label: "Shopping", disabled: true },
  { href: "#", label: "Meals", disabled: true }
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-20 border-b border-[#d8d2c3] bg-[#f3efe3]/95 px-5 py-4 backdrop-blur md:h-screen md:w-72 md:shrink-0 md:border-b-0 md:border-r md:px-6 md:py-6">
      <div className="flex gap-4 md:h-full md:flex-col">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#6f8064] font-black text-white">
            B
          </span>
          <span>
            <span className="block text-xl font-black tracking-tight">Boma</span>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#71675c]">
              Home OS
            </span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-wrap gap-2 md:mt-8 md:flex-col md:flex-nowrap">
          {modules.map((module) => {
            const isActive =
              module.href !== "#" && pathname.startsWith(module.href);

            return (
              <Link
                aria-disabled={module.disabled}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold transition md:w-full",
                  isActive
                    ? "border-[#6f8064] bg-[#6f8064] text-white"
                    : "border-[#d8d2c3] bg-[#fbf6ec] text-[#3f513a] hover:border-[#6f8064]",
                  module.disabled ? "cursor-not-allowed opacity-50" : ""
                ].join(" ")}
                href={module.href}
                key={module.label}
                onClick={(event) => {
                  if (module.disabled) {
                    event.preventDefault();
                  }
                }}
              >
                {module.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
