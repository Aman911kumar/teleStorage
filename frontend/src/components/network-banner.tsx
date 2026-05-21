import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function NetworkBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (online) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-red-500/30 bg-red-950/90 px-4 py-2 text-center text-sm text-red-100 backdrop-blur">
      <span className="inline-flex items-center gap-2"><WifiOff size={15} /> You are offline. Some actions will be unavailable until the connection returns.</span>
    </div>
  );
}
