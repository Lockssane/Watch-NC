import { useState } from "react";
import OpsBar from "./components/dashboard/OpsBar";
import NavMap2D from "./components/map/NavMap2D";
import NavMap3D from "./components/map/NavMap3D";
import { useMockAIS } from "./hooks/useMockAIS";
import { useNavStore } from "./store/navigation";
import { Lock, Unlock } from "lucide-react";

function PublicLayout() {
  useMockAIS();

  return (
    <div className="relative h-screen w-screen bg-abyss">
      <NavMap2D />
      <div className="absolute left-4 top-4 z-10 rounded border border-radar bg-navy/80 px-3 py-1.5 backdrop-blur">
        <span className="font-mono text-sm font-bold text-phosphor">COSS WATCH NC</span>
        <span className="ml-2 text-xs text-ink">- Vue Publique</span>
      </div>
    </div>
  );
}

function OpsLayout() {
  useMockAIS();
  const mode = useNavStore((state) => state.viewMode);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-abyss">
      <OpsBar />
      <div className="relative flex-1">{mode === "2d" ? <NavMap2D /> : <NavMap3D />}</div>
    </div>
  );
}

export default function App() {
  const [isOps, setIsOps] = useState(false);

  return (
    <>
      {isOps ? <OpsLayout /> : <PublicLayout />}
      <button
        type="button"
        onClick={() => setIsOps((current) => !current)}
        className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-full bg-radar px-4 py-2 font-mono text-sm text-white shadow-lg shadow-radar/30 transition hover:bg-radar/80"
      >
        {isOps ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />} {isOps ? "Quitter Ops" : "Mode Ops"}
      </button>
    </>
  );
}
