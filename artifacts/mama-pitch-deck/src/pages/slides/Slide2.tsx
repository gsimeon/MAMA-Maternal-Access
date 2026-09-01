export default function Slide2() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#fbfcfc] font-body text-[#1a1a2e]">
      <div className="absolute -right-[14vw] -top-[18vh] h-[48vw] w-[48vw] rounded-full border-[0.2vw] border-[#2a7b7b] opacity-15" />
      <div className="absolute left-0 top-[17vh] h-[0.5vh] w-[18vw] bg-[#e39b6b]" />
      <main className="relative z-10 flex h-[90vh] flex-col px-[8vw] pt-[10vh]">
        <div className="mb-[5vh]">
          <div className="mb-[1vh] text-[1.2vw] font-bold tracking-[0.05em] text-[#2a7b7b]">01. THE ACCESS GAP</div>
          <h2 className="m-0 max-w-[68vw] text-[4vw] font-semibold leading-[1.08] tracking-[-0.03em]">
            Maternal care is often hard to reach in the moment
          </h2>
        </div>
        <div className="grid max-w-[82vw] grid-cols-2 gap-[2vw]">
          <div className="border-t-[0.2vh] border-[#dce8e5] pt-[2.5vh]">
            <div className="mb-[2vh] text-[3vw] font-semibold leading-none text-[#2a7b7b]">01</div>
            <p className="m-0 max-w-[32vw] text-[1.75vw] leading-[1.3] text-[#4a4a68]">Questions arrive as voice, not neatly typed forms</p>
          </div>
          <div className="border-t-[0.2vh] border-[#dce8e5] pt-[2.5vh]">
            <div className="mb-[2vh] text-[3vw] font-semibold leading-none text-[#2a7b7b]">02</div>
            <p className="m-0 max-w-[32vw] text-[1.75vw] leading-[1.3] text-[#4a4a68]">English-only flows can miss meaning in code-switched speech</p>
          </div>
          <div className="border-t-[0.2vh] border-[#dce8e5] pt-[2.5vh]">
            <div className="mb-[2vh] text-[3vw] font-semibold leading-none text-[#e39b6b]">03</div>
            <p className="m-0 max-w-[32vw] text-[1.75vw] leading-[1.3] text-[#4a4a68]">When a concern is urgent, a failed handoff is a safety problem</p>
          </div>
          <div className="border-t-[0.2vh] border-[#dce8e5] pt-[2.5vh]">
            <div className="mb-[2vh] text-[3vw] font-semibold leading-none text-[#e39b6b]">04</div>
            <p className="m-0 max-w-[32vw] text-[1.75vw] leading-[1.3] text-[#4a4a68]">MAMA is designed around access, clarity, and recovery</p>
          </div>
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 flex h-[10vh] w-full items-center justify-between bg-[#2a7b7b] px-[8vw] text-[1vw] font-medium tracking-[0.05em] text-white">
        <span>MAMA — Maternal Access</span><span className="opacity-80">02</span>
      </footer>
    </div>
  );
}