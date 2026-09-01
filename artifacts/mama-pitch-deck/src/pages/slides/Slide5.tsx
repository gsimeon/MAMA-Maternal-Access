const base = import.meta.env.BASE_URL;

export default function Slide5() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#1a1a2e] font-body text-white">
      <div className="absolute inset-0">
        <img src={`${base}images/mama-support.jpg`} crossOrigin="anonymous" alt="Midwife supporting a mother through a mobile phone" className="h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] via-[#1a1a2e]/90 to-[#1a1a2e]/35" />
      </div>
      <div className="absolute -right-[13vw] -top-[17vh] h-[50vw] w-[50vw] rounded-full border-[0.2vw] border-[#d9efea] opacity-20" />
      <main className="relative z-10 flex h-[90vh] flex-col justify-center px-[8vw]">
        <div className="mb-[3vh] text-[1.2vw] font-bold tracking-[0.05em] text-[#e39b6b]">04. SAFETY ROUTING</div>
        <h2 className="m-0 max-w-[60vw] text-[5.2vw] font-semibold leading-[1.02] tracking-[-0.04em]">Safety routing,<br />not just transcription</h2>
        <div className="mt-[6vh] grid max-w-[70vw] grid-cols-2 gap-x-[5vw] gap-y-[2.7vh]">
          <p className="m-0 border-l-[0.25vw] border-[#2a7b7b] pl-[1.4vw] text-[1.7vw] leading-[1.25] text-white/85">Routine questions follow a calm guidance path</p>
          <p className="m-0 border-l-[0.25vw] border-[#e39b6b] pl-[1.4vw] text-[1.7vw] leading-[1.25] text-white/85">Danger signs are classified for urgent escalation</p>
          <p className="m-0 border-l-[0.25vw] border-[#2a7b7b] pl-[1.4vw] text-[1.7vw] leading-[1.25] text-white/85">High-risk conversations can move toward human support</p>
          <p className="m-0 border-l-[0.25vw] border-[#e39b6b] pl-[1.4vw] text-[1.7vw] leading-[1.25] text-white/85">Failed handoffs recover visibly instead of disappearing</p>
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 flex h-[10vh] w-full items-center justify-between bg-[#2a7b7b] px-[8vw] text-[1vw] font-medium tracking-[0.05em] text-white">
        <span>MAMA — Maternal Access</span><span className="opacity-80">05</span>
      </footer>
    </div>
  );
}