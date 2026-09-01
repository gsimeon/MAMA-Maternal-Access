export default function Slide9() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#fbfcfc] font-body text-[#1a1a2e]">
      <div className="absolute -right-[14vw] -top-[21vw] h-[62vw] w-[62vw] rounded-full border-[0.2vw] border-[#2a7b7b] opacity-20" />
      <div className="absolute right-[10vw] top-[18vh] flex h-[41vw] w-[41vw] items-center justify-center rounded-full border-[0.2vw] border-[#d9eae6]">
        <div className="flex h-[20vw] w-[20vw] items-center justify-center rounded-full bg-[#2a7b7b] text-center shadow-[0_1.5vw_4vw_rgba(42,123,123,0.2)]">
          <div>
            <div className="text-[4.5vw] font-bold tracking-[-0.06em] text-white">MAMA</div>
            <div className="mt-[1vh] text-[1.2vw] font-semibold tracking-[0.12em] text-white/80">MATERNAL ACCESS</div>
          </div>
        </div>
      </div>
      <main className="relative z-10 flex h-[90vh] flex-col justify-center px-[8vw]">
        <div className="mb-[3vh] text-[1.5vw] font-bold tracking-[0.05em] text-[#2a7b7b]">MAMA — MATERNAL ACCESS</div>
        <h2 className="m-0 max-w-[48vw] text-[5.2vw] font-semibold leading-[1.03] tracking-[-0.045em]">Turn maternal voice into safer next steps.</h2>
        <div className="mt-[4vh] h-[0.3vh] w-[6vw] bg-[#e39b6b]" />
        <p className="mt-[3vh] max-w-[39vw] text-[1.8vw] leading-[1.45] text-[#4a4a68]">A focused foundation for language access, safety routing, and reliable human support.</p>
      </main>
      <footer className="absolute bottom-0 left-0 flex h-[10vh] w-full items-center justify-between bg-[#2a7b7b] px-[8vw] text-[1vw] font-medium tracking-[0.05em] text-white">
        <span>MAMA — Maternal Access</span><span className="opacity-80">09</span>
      </footer>
    </div>
  );
}