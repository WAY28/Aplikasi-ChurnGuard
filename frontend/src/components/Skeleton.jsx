import "./Skeleton.css";

export default function Skeleton({ width = "100%", height = "1em", radius, className = "", style }) {
  return (
    <span
      className={`skeleton ${className}`}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}
