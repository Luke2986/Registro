import { AccessForm } from './access-form'

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>
}) {
  const { errore } = await searchParams

  return (
    <div className="access">
      <div className="card access__card">
        <div>
          <h1 className="page-title">Registro</h1>
          <p className="meta">Ti arriva un collegamento per email, valido una volta sola.</p>
        </div>
        <AccessForm
          initialError={
            errore ? 'Il collegamento non è più valido. Chiedine uno nuovo.' : undefined
          }
        />
      </div>
    </div>
  )
}
