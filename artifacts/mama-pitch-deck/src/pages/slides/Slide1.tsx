const base = import.meta.env.BASE_URL;

export default function Slide1() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#fbfcfc] font-body text-[#1a1a2e]">
      <div className="absolute -right-[9vw] -top-[19vh] h-[54vw] w-[54vw] rounded-full border-[0.2vw] border-[#2a7b7b] opacity-20" />
      <div className="absolute right-[8vw] top-[16vh] h-[52vh] w-[35vw] overflow-hidden rounded-[2vw] bg-[#eaf2f0]">
        <img
          src={`${base}images/mama-hero.jpg`}
          crossOrigin="anonymous"
          alt="Mother speaking with a midwife in a calm clinic"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/35 via-transparent to-[#2a7b7b]/20" />
        <div className="absolute bottom-[4vh] left-[3vw] flex items-center gap-[0.8vw] rounded-full bg-[#fbfcfc]/90 px-[1.2vw] py-[0.8vh] text-[1.2vw] font-semibold text-[#2a7b7b]">
          <span className="h-[0.7vw] w-[0.7vw] rounded-full bg-[#e39b6b]" />
          Voice-first maternal access
        </div>
      </div>
      <div className="absolute left-[8vw] top-[8vh] text-[1.5vw] font-bold tracking-[0.05em] text-[#2a7b7b]">
        MAMA
      </div>
      <main className="relative z-10 flex h-[90vh] flex-col justify-center px-[8vw]">
        <div className="max-w-[52vw]">
          <h1 className="m-0 text-[6.5vw] font-semibold leading-[1.02] tracking-[-0.05em] text-[#1a1a2e]">
            MAMA
            <span className="block text-[4.2vw] tracking-[-0.04em]">— Maternal Access</span>
          </h1>
          <div className="mt-[4vh] flex max-w-[44vw] items-center">
            <div className="mr-[2vw] h-[0.3vh] w-[4vw] bg-[#2a7b7b]" />
            <p className="m-0 text-[1.8vw] leading-[1.5] text-[#4a4a68]">
              A voice-first maternal access layer for safer next steps.
            </p>
          </div>
        </div>
      </main>
      <footer className="absolute bottom-0 left-0 flex h-[10vh] w-full items-center justify-between bg-[#2a7b7b] px-[8vw] text-[1vw] font-medium tracking-[0.05em] text-white">
        <span>MAMA — Maternal Access</span>
        <span className="opacity-80">Pitch deck · 2026</span>
      </footer>
    </div>
  );
}