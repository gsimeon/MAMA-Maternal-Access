export default function Slide8() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#fbfcfc] font-body text-[#1a1a2e]">
      <div className="absolute left-[70vw] top-[11vh] h-[38vw] w-[38vw] rounded-full border-[0.2vw] border-[#2a7b7b] opacity-15" />
      <main className="relative z-10 flex h-[90vh] flex-col px-[8vw] pt-[10vh]">
        <div className="mb-[5vh]">
          <div className="mb-[1vh] text-[1.2vw] font-bold tracking-[0.05em] text-[#2a7b7b]">07. TRUST & SAFETY</div>
          <h2 className="m-0 text-[4vw] font-semibold leading-[1.08] tracking-[-0.03em]">Production-minded safeguards</h2>
        </div>
        <div className="grid max-w-[78vw] grid-cols-2 gap-x-[6vw] gap-y-[3.5vh]">
          <div className="flex gap-[1.4vw] border-t-[0.2vh] border-[#dce8e5] pt-[2vh]">
            <span className="text-[2.6vw] font-bold leading-none text-[#2a7b7b]">01</span>
            <p className="m-0 text-[1.65vw] leading-[1.25] text-[#4a4a68]">Live transcription requires an authenticated session</p>
          </div>
          <div className="flex gap-[1.4vw] border-t-[0.2vh] border-[#dce8e5] pt-[2vh]">
            <span className="text-[2.6vw] font-bold leading-none text-[#2a7b7b]">02</span>
            <p className="m-0 text-[1.65vw] leading-[1.25] text-[#4a4a68]">Requests are limited to the MAMA app origin</p>
          </div>
          <div className="flex gap-[1.4vw] border-t-[0.2vh] border-[#dce8e5] pt-[2vh]">
            <span className="text-[2.6vw] font-bold leading-none text-[#e39b6b]">03</span>
            <p className="m-0 text-[1.65vw] leading-[1.25] text-[#4a4a68]">Shared quotas make provider capacity explicit</p>
          </div>
          <div className="flex gap-[1.4vw] border-t-[0.2vh] border-[#dce8e5] pt-[2vh]">
            <span className="text-[2.6vw] font-bold leading-none text-[#e39b6b]">04</span>
            <p className="m-0 text-[1.65vw] leading-[1.25] text-[#4a4a68]">Provider failures return a clear recovery state</p>
          </div>
        </div>
        <div className="mt-[7vh] flex max-w-[72vw] items-center gap-[1.5vw] rounded-[1vw] bg-[#1a1a2e] px-[2vw] py-[2.4vh] text-[1.8vw] font-semibold leading-[1.2] text-white">
          <span className="h-[1.1vw] w-[1.1vw] rounded-full bg-[#e39b6b]" />
          The system is designed to fail visibly and safely
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 flex h-[10vh] w-full items-center justify-between bg-[#2a7b7b] px-[8vw] text-[1vw] font-medium tracking-[0.05em] text-white">
        <span>MAMA — Maternal Access</span><span className="opacity-80">08</span>
      </footer>
    </div>
  );
}