import type { Grade } from "@/lib/database.types";

export default function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <span
      className={`grade-${grade} inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold text-white min-w-[36px]`}
    >
      {grade}
    </span>
  );
}
