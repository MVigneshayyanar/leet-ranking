import { useState } from 'react';
import { Globe } from 'lucide-react';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyxtpJ-JWXW48nUSPd8w3EvoiPCtKUq9ma6MEMSaVOKSJY5sPD-FtJwSb8nbdCyOKq5wA/exec";

const SkillRackStats = () => {
  const [iframeLoading, setIframeLoading] = useState(true);

  return (
    <div className="w-full h-screen relative flex flex-col bg-slate-950 overflow-hidden">
      {/* Loading Overlay */}
      {iframeLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm">
          <div className="relative mb-4">
            <div className="w-14 h-14 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe className="text-blue-400 animate-pulse" size={20} />
            </div>
          </div>
          <p className="text-sm font-bold text-white tracking-tight">Loading SkillRack Dashboard...</p>
        </div>
      )}

      {/* Full-bleed Embedded Iframe */}
      <iframe
        src={SCRIPT_URL}
        title="SkillRack Live Script"
        className="w-full h-full border-0 bg-white"
        onLoad={() => setIframeLoading(false)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      />
    </div>
  );
};

export default SkillRackStats;
