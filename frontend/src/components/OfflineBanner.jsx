import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../utils/useOnlineStatus";
import "./OfflineBanner.css";

export default function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="offline-banner" role="status">
      <WifiOff size={16} />
      <span>Mode offline. Data yang tampil mungkin tidak terbaru dan upload baru belum bisa dilakukan.</span>
    </div>
  );
}
