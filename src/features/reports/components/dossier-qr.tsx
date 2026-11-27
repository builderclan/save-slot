import QRCode from "qrcode";

interface DossierQRProps {
  url: string;
  label?: string;
}

/**
 * Server component — generates a QR code as a data URL and inlines it.
 * Renders a small A4-safe block with label beneath.
 */
export async function DossierQR({ url, label }: DossierQRProps) {
  let dataUrl = "";
  try {
    dataUrl = await QRCode.toDataURL(url, { width: 112, margin: 1, color: { dark: "#18181b", light: "#ffffff" } });
  } catch {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="QR Code" width={112} height={112} className="border border-zinc-200 rounded-sm" />
      {label && (
        <p className="text-[9px] text-zinc-500 font-mono text-center max-w-[112px] leading-tight break-all">
          {label}
        </p>
      )}
    </div>
  );
}
