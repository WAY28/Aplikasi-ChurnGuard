import { Activity } from "lucide-react";
import "./Logo.css";

// size: "sm" | "md" | "lg"
export default function Logo({ size = "md" }) {
  return (
    <span className={`logo logo-${size}`} aria-hidden="true">
      <Activity strokeWidth={2.5} />
    </span>
  );
}
