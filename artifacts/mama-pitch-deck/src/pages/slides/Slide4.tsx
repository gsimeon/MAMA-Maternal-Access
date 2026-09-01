export default function Slide4() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#fbfcfc] font-body text-[#1a1a2e]">
      <div className="absolute -right-[11vw] top-[15vh] h-[53vw] w-[53vw] rounded-full border-[0.2vw] border-[#2a7b7b] opacity-15" />
      <main className="relative z-10 flex h-[90vh] flex-col px-[8vw] pt-[10vh]">
        <div className="mb-[5vh]">
          <div className="mb-[1vh] text-[1.2vw] font-bold tracking-[0.05em] text-[#2a7b7b]">03. LANGUAGE ACCESS</div>
          <h2 className="m-0 text-[4vw] font-semibold leading-[1.08] tracking-[-0.03em]">Language access is part of the product</h2>
        </div>
        <div className="flex gap-[6vw]">
          <div className="w-[38vw]">
            <div className="mb-[3vh] flex items-end gap-[1vw]">
              <span className="text-[8vw] font-bold leading-none text-[#2a7b7b]">12</span>
              <span className="pb-[1vh] text-[1.5vw] font-semibold leading-[1.25] text-[#4a4a68]">fixed African-language<br />code-switching pairs</span>
            </div>
            <div className="h-[0.2vh] w-full bg-[#dce8e5]" />
            <p className="mt-[3vh] max-w-[34vw] text-[1.7vw] leading-[1.35] text-[#4a4a68]">English paired with 12 fixed African-language code-switching pairs</p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-[1.5vw]">
            <div className="rounded-[1vw] bg-[#eef5f3] p-[2vw]">
              <div className="mb-[3vh] h-[3vw] w-[3vw] rounded-[0.6vw] bg-[#2a7b7b]" />
              <p className="m-0 text-[1.5vw] font-semibold leading-[1.3] text-[#1a1a2e]">Transcription is evaluated against locked reference scenarios</p>
            </div>
            <div className="rounded-[1vw] bg-[#eef5f3] p-[2vw]">
              <div className="mb-[3vh] h-[3vw] w-[3vw] rounded-[0.6vw] bg-[#e39b6b]" />
              <p className="m-0 text-[1.5vw] font-semibold leading-[1.3] text-[#1a1a2e]">Untested language pairs stay visibly pending instead of being presented as validated</p>
            </div>
            <div className="col-span-2 mt-[1vh] border-l-[0.35vw] border-[#e39b6b] pl-[2vw]">
              <p className="m-0 text-[2vw] font-semibold leading-[1.25] text-[#2a7b7b]">The goal: preserve meaning where mothers actually speak</p>
            </div>
          </div>
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 flex h-[10vh] w-full items-center justify-between bg-[#2a7b7b] px-[8vw] text-[1vw] font-medium tracking-[0.05em] text-white">
        <span>MAMA — Maternal Access</span><span className="opacity-80">04</span>
      </footer>
    </div>
  );
}