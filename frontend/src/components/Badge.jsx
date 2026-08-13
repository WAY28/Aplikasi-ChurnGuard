import "./Badge.css";

// tone: "danger" | "success" | "info" | "neutral"
export default function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
