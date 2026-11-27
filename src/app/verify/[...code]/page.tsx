import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { getPublicVerifyPayload } from "@/server/reports";
import { VerifyView } from "@/features/verify/components/verify-view";

interface PageProps {
  params: Promise<{ code: string[] }>;
}

function decodeRefCode(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join("/");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Verify ${decodeRefCode(code)} · SaveSlot`,
  };
}

export default async function PublicVerifyPage({ params }: PageProps) {
  const { code } = await params;
  const refCode = decodeRefCode(code);
  const result = await getPublicVerifyPayload(refCode);

  if (!result.ok) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-3 shadow-sm">
          <ShieldAlert className="w-10 h-10 text-zinc-400 mx-auto" />
          <h1 className="text-lg font-bold text-zinc-900">Record Not Found</h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            No verified event record was found for reference code{" "}
            <span className="font-mono font-semibold text-zinc-700">{refCode}</span>.
          </p>
          <Link
            href="/"
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-700 transition-colors"
          >
            Back to Campus Calendar
          </Link>
        </div>
      </div>
    );
  }

  return <VerifyView data={result.data} />;
}
