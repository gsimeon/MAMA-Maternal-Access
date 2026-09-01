export default function Slide7() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f2f7f5] font-body text-[#1a1a2e]">
      <div className="absolute -right-[15vw] -top-[16vw] h-[45vw] w-[45vw] rounded-full border-[0.2vw] border-[#2a7b7b] opacity-15" />
      <main className="relative z-10 flex h-[90vh] flex-col px-[8vw] pt-[10vh]">
        <div className="mb-[5vh]">
          <div className="mb-[1vh] text-[1.2vw] font-bold tracking-[0.05em] text-[#2a7b7b]">06. EVALUATION</div>
          <h2 className="m-0 text-[4vw] font-semibold leading-[1.08] tracking-[-0.03em]">Built for evidence, not demo theatre</h2>
        </div>
        <div className="flex gap-[5vw]">
          <div className="w-[34vw]">
            <div className="mb-[2vh] text-[7vw] font-bold leading-none text-[#2a7b7b]">03</div>
            <p className="m-0 text-[1.7vw] font-semibold leading-[1.3] text-[#4a4a68]">benchmark paths shown side by side</p>
            <div className="mt-[4vh] flex gap-[1vw]">
              <span className="rounded-full bg-[#2a7b7b] px-[1.2vw] py-[0.8vh] text-[1.2vw] font-semibold text-white">SAHARA</span>
              <span className="rounded-full bg-[#d9eae6] px-[1.2vw] py-[0.8vh] text-[1.2vw] font-semibold text-[#2a7b7b]">Whisper</span>
              <span className="rounded-full bg-[#d9eae6] px-[1.2vw] py-[0.8vh] text-[1.2vw] font-semibold text-[#2a7b7b]">Gemini Audio</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-[2vh]">
            <p className="m-0 border-b-[0.2vh] border-[#dce8e5] pb-[2vh] text-[1.6vw] leading-[1.25] text-[#4a4a68]">Stored synthetic maternal-health scenarios make behavior inspectable</p>
            <p className="m-0 border-b-[0.2vh] border-[#dce8e5] pb-[2vh] text-[1.6vw] leading-[1.25] text-[#4a4a68]">Benchmark views compare SAHARA, Whisper, and Gemini Audio paths</p>
            <p className="m-0 border-b-[0.2vh] border-[#dce8e5] pb-[2vh] text-[1.6vw] leading-[1.25] text-[#4a4a68]">Evaluation tracks word error, intent, critical facts, action, and latency</p>
            <p className="m-0 text-[1.6vw] leading-[1.25] text-[#4a4a68]">Live provider runs are separated from stored demo results</p>
          </div>
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 flex h-[10vh] w-full items-center justify-between bg-[#2a7b7b] px-[8vw] text-[1vw] font-medium tracking-[0.05em] text-white">
        <span>MAMA — Maternal Access</span><span className="opacity-80">07</span>
      </footer>
    </div>
  );
}