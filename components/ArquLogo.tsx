import Image from "next/image";
import Link from "next/link";

interface ArquLogoProps {
  /** Height in px. Width scales proportionally. Default: 32 */
  height?: number;
  /** If true, wraps in a Link to "/" */
  linked?: boolean;
}

export function ArquLogo({ height = 32, linked = true }: ArquLogoProps) {
  // arqu logo 1 is roughly 1050×840 → ratio ~1.25 wide
  const width = Math.round(height * 1.25);

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="arqu studio"
      width={width}
      height={height}
      style={{ height, width: "auto", display: "block" }}
    />
  );

  if (linked) {
    return (
      <Link href="/" className="flex items-center shrink-0">
        {img}
      </Link>
    );
  }

  return <div className="flex items-center shrink-0">{img}</div>;
}
