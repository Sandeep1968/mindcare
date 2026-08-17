export default function BrandLogo({ className = 'h-12 w-auto max-w-[220px]', alt = 'MindCare — Compassion. Clarity. Care.' }) {
  return (
    <img
      src="/logo.png"
      width={965}
      height={302}
      alt={alt}
      className={`object-contain ${className}`}
    />
  );
}
