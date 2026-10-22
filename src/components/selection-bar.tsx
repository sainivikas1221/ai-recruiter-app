"use client";

import { useEffect, useRef, useState } from "react";

/** Floats an "Auto-apply" button over the job list as soon as any job is ticked. */
export function SelectionBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const update = () => setCount(form.querySelectorAll('input[name="job"]:checked').length);
    update();
    form.addEventListener("change", update);
    return () => form.removeEventListener("change", update);
  }, []);

  return (
    <div ref={ref} className={count ? "fixed inset-x-0 bottom-4 z-20 flex justify-center px-4" : "hidden"}>
      <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-accent bg-surface px-4 py-3 shadow-lg">
        <span className="text-sm">
          {count} {count === 1 ? "job" : "jobs"} selected
        </span>
        <button className="btn py-1.5">
          Auto-apply to {count} {count === 1 ? "job" : "jobs"}
        </button>
      </div>
    </div>
  );
}
