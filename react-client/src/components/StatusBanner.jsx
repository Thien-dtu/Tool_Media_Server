export default function StatusBanner({ message }) {
  if (!message) return null
  return <div className="status" role="status" aria-live="polite">{message}</div>
}

