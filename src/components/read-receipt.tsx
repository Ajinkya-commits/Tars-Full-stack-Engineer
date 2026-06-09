import { Check, CheckCheck } from "lucide-react";

type ReadReceiptStatus = "sent" | "delivered" | "seen";

interface ReadReceiptProps {
  readBy: string[];
  isGroup: boolean;
  totalOtherMembers: number;
}

function getStatus(
  readBy: string[],
  isGroup: boolean,
  totalOtherMembers: number
): ReadReceiptStatus {
  if (readBy.length === 0) return "delivered";
  if (isGroup) {
    // In a group, "seen" means all other members have read it
    return readBy.length >= totalOtherMembers ? "seen" : "delivered";
  }
  // DM: seen if the other person read it
  return "seen";
}

export function ReadReceipt({
  readBy,
  isGroup,
  totalOtherMembers,
}: ReadReceiptProps) {
  const status = getStatus(readBy, isGroup, totalOtherMembers);

  if (status === "sent") {
    return (
      <Check
        className="h-3 w-3 text-blue-200/70 inline-block ml-0.5"
        strokeWidth={2.5}
        aria-label="Sent"
      />
    );
  }

  if (status === "delivered") {
    return (
      <CheckCheck
        className="h-3 w-3 text-blue-200/70 inline-block ml-0.5"
        strokeWidth={2.5}
        aria-label="Delivered"
      />
    );
  }

  // seen
  return (
    <CheckCheck
      className="h-3 w-3 text-sky-300 inline-block ml-0.5"
      strokeWidth={2.5}
      aria-label="Seen"
    />
  );
}
