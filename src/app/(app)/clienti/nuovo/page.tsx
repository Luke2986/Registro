import { NewClientForm } from './new-client-form'

export default function NewClientPage() {
  return (
    <main className="main section--clienti">
      <header className="page-header">
        <h1 className="page-title">Nuovo cliente</h1>
      </header>

      <div className="card">
        <NewClientForm />
      </div>
    </main>
  )
}
