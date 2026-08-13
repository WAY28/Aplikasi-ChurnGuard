import { Inbox } from "lucide-react";
import "./EmptyState.css";

// tone: "neutral" (default) | "highlight" -- highlight dipakai terbatas untuk
// momen spesial saja (mis. mode coba tanpa akun sudah habis)
export default function EmptyState({ title, description, action, icon: Icon = Inbox, tone = "neutral" }) {
  return (
    <div className="empty-state">
      <div className={`empty-state-icon empty-state-icon-${tone}`} aria-hidden="true">
        <Icon size={28} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
