import Link from 'next/link'

/**
 * Cosa è successo e cosa fare, con l'azione di riprova accanto (design-system.md §6).
 * Il dettaglio tecnico resta nei log del server: qui non ci finisce mai.
 */
export function ErrorState({ message, retryHref }: { message: string; retryHref: string }) {
  return (
    <div className="error-box" role="alert">
      <p style={{ margin: 0 }}>{message}</p>
      <Link href={retryHref} className="btn btn--secondary">
        Riprova
      </Link>
    </div>
  )
}
