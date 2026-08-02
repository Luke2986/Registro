import { NewClientForm } from './new-client-form'

export default function NewClientPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Nuovo cliente</h1>
      </header>

      <div className="card">
        <NewClientForm />
      </div>
    </>
  )
}
