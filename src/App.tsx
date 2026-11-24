import { useState } from "react";
import { AllotlyProvider, useAllotly } from "@/state/allotly-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DesktopDashboard } from "@/layouts/desktop-dashboard";
import { MobileTabs } from "@/layouts/mobile-tabs";
import { inputCls } from "@/components/brand";

function PasscodePrompt() {
  const { submitPasscode, continueOffline } = useAllotly();
  const [code, setCode] = useState("");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f6f7fb] p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-[20px] border border-[#e5e7eb] bg-white p-8">
        <div>
          <h2 className="m-0 text-2xl font-bold">Enter passcode</h2>
          <div className="accent-bar" />
        </div>
        <p className="m-0 text-sm text-[#475569]">Enter your passcode to sync data across devices.</p>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitPasscode(code)}
          placeholder="Passcode"
          className={inputCls}
          autoFocus
        />
        <button type="button" onClick={() => submitPasscode(code)} className="bg-brand min-h-11 rounded-[10px] border-none text-sm font-semibold text-white">
          Continue
        </button>
        <button type="button" onClick={continueOffline} className="min-h-11 rounded-[10px] border border-[#e2e8f0] bg-white text-sm text-[#334155]">
          Continue offline
        </button>
      </div>
    </div>
  );
}

function Shell() {
  const { showPasscodePrompt } = useAllotly();
  const isMobile = useIsMobile();
  if (showPasscodePrompt) return <PasscodePrompt />;
  return isMobile ? <MobileTabs /> : <DesktopDashboard />;
}

export default function App() {
  return (
    <AllotlyProvider>
      <TooltipProvider delayDuration={0}>
        <Shell />
      </TooltipProvider>
    </AllotlyProvider>
  );
}
