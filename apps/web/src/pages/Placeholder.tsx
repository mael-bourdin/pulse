import { PageTitle } from '../layout/PageTitle'

// Page provisoire : chaque fonctionnalité remplace la sienne (voir spec/features/).
export function Placeholder({ title, ticket }: { title: string; ticket: string }) {
  return (
    <section aria-labelledby="titre-page">
      <PageTitle>{title}</PageTitle>
      <p className="muted">Écran à venir ({ticket}).</p>
    </section>
  )
}
