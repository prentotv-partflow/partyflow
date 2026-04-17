import Link from "next/link";
export default function Home() {
  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">PartyFlow</h1>
        <p className="text-lg mb-6">
          Order. Flow. Enjoy.
        </p>

        <Link
  href="/login"
  className="bg-white text-black px-6 py-3 rounded-full font-semibold inline-block"
>
  Get Started
</Link>

      </div>
    </div>
  );
}