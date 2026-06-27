interface StatusBadgeProps {
  type: "priority" | "status";
  value: string;
}

export default function StatusBadge({ type, value }: StatusBadgeProps) {
  if (type === "priority") {
    let bg = "#F3F4F6";
    let color = "#4B5563";

    if (value === "URGENT") {
      bg = "#FEE2E2"; // soft red
      color = "#EF4444"; // bold red
    } else if (value === "MEDIUM") {
      bg = "#E6F4EA"; // soft green
      color = "#137333"; // dark green
    } else if (value === "LOW") {
      bg = "#F1F3F4"; // soft grey
      color = "#5F6368"; // dark grey
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: 700,
          backgroundColor: bg,
          color: color,
          letterSpacing: "0.2px",
          textTransform: "uppercase",
        }}
      >
        {value}
      </span>
    );
  }

  // Otherwise it's a Status indicator (dot + label)
  let dotColor = "#9CA3AF"; // grey (default for Pending Review / Pending)
  let textColor = "#4B5563";

  if (value === "Review Started") {
    dotColor = "#0F9D58"; // dark green dot
    textColor = "#0F9D58";
  } else if (value === "Pending Review") {
    dotColor = "#9CA3AF";
    textColor = "#374151";
  } else if (value === "Pending") {
    dotColor = "#9CA3AF";
    textColor = "#374151";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "13px",
        fontWeight: 500,
        color: textColor,
      }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          backgroundColor: dotColor,
          display: "inline-block",
        }}
      />
      {value}
    </span>
  );
}
