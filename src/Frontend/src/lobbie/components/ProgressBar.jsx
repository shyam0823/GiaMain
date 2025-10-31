import React from "react"

// Small helper to join class names
function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

export function ProgressBar({
  percentage = 0,
  className = "",
  showPercentage = true,
  segments = 5, //  segmented look (5 blocks: ███▒▒)
  size = "md",
}) {
  const sizeClasses = {
    sm: "h-2", // slightly taller for segments
    md: "h-3",
    lg: "h-4",
  }

  const safePct = Math.min(100, Math.max(0, percentage))
  const filledSegments = Math.round((safePct / 100) * segments)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-sm transition-colors duration-300",
              sizeClasses[size],
              "w-4" // width of each block
            )}
            style={{
              backgroundColor: i < filledSegments ? "#2563eb" : "#d1d5db", // blue vs gray
            }}
          />
        ))}
      </div>
      {showPercentage && (
        <span className="text-sm font-medium min-w-[3rem] text-gray-700">
          {safePct}%
        </span>
      )}
    </div>
  )
}
