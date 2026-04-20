import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-b from-[#05070D] via-[#0A0C12] to-[#120B22] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 sm:py-12">
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
          {/* LEFT: HERO COPY */}
          <div className="mx-auto flex max-w-xl flex-col items-center text-center lg:mx-0 lg:items-start lg:text-left">
            <p className="text-[10px] uppercase tracking-[0.26em] text-[#B8A6FF]">
              Live Event Ordering
            </p>

            <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
              PartyFlow
            </h1>

            <p className="mt-4 text-lg leading-8 text-white/70 sm:text-xl">
              Order. Flow. Enjoy.
            </p>

            <p className="mt-4 max-w-lg text-sm leading-7 text-white/50 sm:text-base">
              Hosts manage requests in real time. Guests join instantly with a
              link and order without the bar line chaos.
            </p>

            <div className="mt-7">
              <Link
                href="/login"
                className="inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
              >
                Host Login
              </Link>
            </div>

            <p className="mt-4 text-xs text-white/32">
              Guests join instantly by link or QR code.
            </p>
          </div>

          {/* RIGHT: IMPACT LOGO HERO */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute h-56 w-56 rounded-full bg-[#8B5CFF]/20 blur-3xl sm:h-80 sm:w-80 lg:h-96 lg:w-96" />

            <div className="relative rounded-[2rem] border border-white/8 bg-white/[0.03] p-4 backdrop-blur-xl sm:p-5 lg:p-6">
              <Image
                src="/branding/partyflow-logo-impact.png"
                alt="PartyFlow logo"
                width={420}
                height={420}
                className="h-auto w-[200px] sm:w-[280px] lg:w-[380px]"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}