export default function Slide3() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f2f7f5] font-body text-[#1a1a2e]">
      <div className="absolute -left-[15vw] -top-[15vw] h-[42vw] w-[42vw] rounded-full border-[0.2vw] border-[#2a7b7b] opacity-15" />
      <main className="relative z-10 flex h-[90vh] flex-col px-[8vw] pt-[10vh]">
        <div className="mb-[4vh]">
          <div className="mb-[1vh] text-[1.2vw] font-bold tracking-[0.05em] text-[#2a7b7b]">02. THE PRODUCT</div>
          <h2 className="m-0 text-[4vw] font-semibold leading-[1.08] tracking-[-0.03em]">A safer path from voice to action</h2>
        </div>
        <div className="flex items-center gap-[1.2vw] pt-[4vh]">
          <div className="flex h-[24vh] w-[18vw] flex-col justify-between rounded-[1.2vw] bg-white p-[2vw] shadow-[0_1vw_3vw_rgba(26,26,46,0.07)]">
            <div className="flex h-[4vw] w-[4vw] items-center justify-center rounded-full bg-[#2a7b7b] text-[1.8vw] font-bold text-white">01</div>
            <p className="m-0 text-[1.55vw] font-semibold leading-[1.25]">Speak naturally about a maternal-health concern</p>
          </div>
          <div className="h-[0.25vh] w-[3vw] bg-[#e39b6b]" />
          <div className="flex h-[24vh] w-[18vw] flex-col justify-between rounded-[1.2vw] bg-white p-[2vw] shadow-[0_1vw_3vw_rgba(26,26,46,0.07)]">
            <div className="flex h-[4vw] w-[4vw] items-center justify-center rounded-full bg-[#2a7b7b] text-[1.8vw] font-bold text-white">02</div>
            <p className="m-0 text-[1.55vw] font-semibold leading-[1.25]">Receive a readable transcript in context</p>
          </div>
          <div className="h-[0.25vh] w-[3vw] bg-[#e39b6b]" />
          <div className="flex h-[24vh] w-[18vw] flex-col justify-between rounded-[1.2vw] bg-white p-[2vw] shadow-[0_1vw_3vw_rgba(26,26,46,0.07)]">
            <div className="flex h-[4vw] w-[4vw] items-center justify-center rounded-full bg-[#2a7b7b] text-[1.8vw] font-bold text-white">03</div>
            <p className="m-0 text-[1.55vw] font-semibold leading-[1.25]">Route the conversation by risk level</p>
          </div>
          <div className="h-[0.25vh] w-[3vw] bg-[#e39b6b]" />
          <div className="flex h-[24vh] w-[18vw] flex-col justify-between rounded-[1.2vw] bg-[#1a1a2e] p-[2vw] text-white shadow-[0_1vw_3vw_rgba(26,26,46,0.14)]">
            <div className="flex h-[4vw] w-[4vw] items-center justify-center rounded-full bg-[#e39b6b] text-[1.8vw] font-bold text-[#1a1a2e]">04</div>
            <p className="m-0 text-[1.55vw] font-semibold leading-[1.25]">Surface urgent guidance and human support when needed</p>
          </div>
        </div>
        <div className="mt-[7vh] flex items-center gap-[1vw] text-[1.25vw] font-semibold tracking-[0.03em] text-[#2a7b7b]">
          <span className="h-[0.8vw] w-[0.8vw] rounded-full bg-[#e39b6b]" />
          VOICE → CONTEXT → SAFETY → SUPPORT
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 flex h-[10vh] w-full items-center justify-between bg-[#2a7b7b] px-[8vw] text-[1vw] font-medium tracking-[0.05em] text-white">
        <span>MAMA — Maternal Access</span><span className="opacity-80">03</span>
      </footer>
    </div>
  );
}