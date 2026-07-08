'use client';

type Props = {
  url: string;
  handle?: string;
  size?: number;
};

function extractHandle(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    const part = path.split('/').filter(Boolean).pop();
    return part ? `@${part}` : '@instagram';
  } catch {
    return '@instagram';
  }
}

/** Stylish Instagram QR badge for invoice / receipt print. */
export function InstagramQrBadge({ url, handle, size = 92 }: Props) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=10&ecc=M&data=${encodeURIComponent(url)}`;
  const label = handle || extractHandle(url);

  return (
    <div className="instagram-qr pointer-events-none select-none text-center">
      <div
        className="relative mx-auto rounded-[18px] p-[3px] shadow-lg"
        style={{
          background:
            'linear-gradient(135deg, #f58529 0%, #dd2a7b 40%, #8134af 70%, #515bd4 100%)',
          width: size + 22,
        }}
      >
        <div className="rounded-[15px] bg-white p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt="Instagram QR code"
            width={size}
            height={size}
            className="block rounded-md"
            style={{ width: size, height: size }}
          />
          <div className="mt-1 flex items-center justify-center gap-1">
            <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
              <defs>
                <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f58529" />
                  <stop offset="50%" stopColor="#dd2a7b" />
                  <stop offset="100%" stopColor="#515bd4" />
                </linearGradient>
              </defs>
              <path
                fill="url(#ig-grad)"
                d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"
              />
            </svg>
            <span
              className="text-[8px] font-bold uppercase tracking-wider"
              style={{
                background: 'linear-gradient(90deg, #f58529, #dd2a7b, #515bd4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Follow us
            </span>
          </div>
        </div>
      </div>
      <p className="mt-1 max-w-[110px] truncate text-[8px] font-medium text-slate-500">{label}</p>
    </div>
  );
}
