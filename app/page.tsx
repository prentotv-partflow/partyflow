import Link from "next/link";

export default function Home() {
  return (
    <main className="flex items-center justify-center h-screen bg-black text-white px-6">
      <div className="text-center max-w-md space-y-6">
        
        {/* Brand */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            PartyFlow
          </h1>
          <p className="text-lg text-gray-300">
            Order. Flow. Enjoy.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/login"
          className="bg-white text-black px-6 py-3 rounded-full font-semibold inline-block hover:opacity-90 transition"
        >
          Get Started
        </Link>

        {/* Future-ready hint (non-functional, optional UX signal) */}
        <p className="text-xs text-gray-500">
          Host events instantly. Guests join with a link.
        </p>

      </div>
    </main>
  );
}