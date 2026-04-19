import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-b from-[#05070D] via-[#0A0C12] to-[#120B22] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12">
        <div className="grid w-full gap-12 lg:grid-cols-2 lg:items-center">
          {/* LEFT: HERO COPY */}
          <div className="max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.26em] text-[#B8A6FF]">
              Live Event Ordering
            </p>

            <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
              PartyFlow
            </h1>

            <p className="mt-5 text-lg leading-8 text-white/70 sm:text-xl">
              Order. Flow. Enjoy.
            </p>

            <p className="mt-5 max-w-lg text-sm leading-7 text-white/50 sm:text-base">
              Hosts manage requests in real time. Guests join instantly with a
              link and order without the bar line chaos.
            </p>

            <div className="mt-8">
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
            <div className="absolute h-72 w-72 rounded-full bg-[#8B5CFF]/20 blur-3xl sm:h-96 sm:w-96" />

            <div className="relative rounded-[2rem] border border-white/8 bg-white/[0.03] p-6 backdrop-blur-xl">
              <Image
                src="/branding/partyflow-logo-impact.png"
                alt="PartyFlow logo"
                width={420}
                height={420}
                className="h-auto w-[240px] sm:w-[320px] lg:w-[380px]"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}