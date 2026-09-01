export default function Slide6() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#fbfcfc] font-body text-[#1a1a2e]">
      <div className="absolute -left-[18vw] top-[27vh] h-[45vw] w-[45vw] rounded-full border-[0.2vw] border-[#2a7b7b] opacity-10" />
      <main className="relative z-10 flex h-[90vh] flex-col px-[8vw] pt-[10vh]">
        <div className="mb-[4vh]">
          <div className="mb-[1vh] text-[1.2vw] font-bold tracking-[0.05em] text-[#2a7b7b]">05. THE SYSTEM</div>
          <h2 className="m-0 text-[4vw] font-semibold leading-[1.08] tracking-[-0.03em]">How MAMA works</h2>
        </div>
        <div className="relative mt-[2vh] flex items-start justify-between">
          <div className="absolute left-[5vw] right-[5vw] top-[4.5vw] h-[0.3vh] bg-[#cfe1de]" />
          <div className="relative z-10 w-[18vw]">
            <div className="mb-[2vh] flex h-[9vw] w-[9vw] items-center justify-center rounded-full bg-[#2a7b7b] text-[3vw] font-bold text-white">01</div>
            <div className="mb-[1vh] text-[1.5vw] font-bold text-[#2a7b7b]">Capture</div>
            <p className="m-0 text-[1.55vw] leading-[1.3] text-[#4a4a68]">voice input starts the conversation</p>
          </div>
          <div className="relative z-10 w-[18vw]">
            <div className="mb-[2vh] flex h-[9vw] w-[9vw] items-center justify-center rounded-full bg-[#2a7b7b] text-[3vw] font-bold text-white">02</div>
            <div className="mb-[1vh] text-[1.5vw] font-bold text-[#2a7b7b]">Understand</div>
            <p className="m-0 text-[1.55vw] leading-[1.3] text-[#4a4a68]">transcription preserves the message</p>
          </div>
          <div className="relative z-10 w-[18vw]">
            <div className="mb-[2vh] flex h-[9vw] w-[9vw] items-center justify-center rounded-full bg-[#e39b6b] text-[3vw] font-bold text-[#1a1a2e]">03</div>
            <div className="mb-[1vh] text-[1.5vw] font-bold text-[#e39b6b]">Assess</div>
            <p className="m-0 text-[1.55vw] leading-[1.3] text-[#4a4a68]">safety signals shape the response</p>
          </div>
          <div className="relative z-10 w-[18vw]">
            <div className="mb-[2vh] flex h-[9vw] w-[9vw] items-center justify-center rounded-full bg-[#1a1a2e] text-[3vw] font-bold text-white">04</div>
            <div className="mb-[1vh] text-[1.5vw] font-bold text-[#1a1a2e]">Recover</div>
            <p className="m-0 text-[1.55vw] leading-[1.3] text-[#4a4a68]">the user can choose human support when it matters</p>
          </div>
        </div>
        <div className="mt-[8vh] flex items-center gap-[1vw] rounded-[1vw] bg-[#eef5f3] px-[2vw] py-[2vh] text-[1.45vw] font-semibold text-[#2a7b7b]">
          <span className="flex h-[2.5vw] w-[2.5vw] items-center justify-center rounded-full bg-[#e39b6b] text-[#1a1a2e]">↻</span>
          A highlighted recovery loop keeps the user connected to support.
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 flex h-[10vh] w-full items-center justify-between bg-[#2a7b7b] px-[8vw] text-[1vw] font-medium tracking-[0.05em] text-white">
        <span>MAMA — Maternal Access</span><span className="opacity-80">06</span>
      </footer>
    </div>
  );
}