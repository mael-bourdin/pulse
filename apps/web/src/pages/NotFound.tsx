import { Link } from 'react-router'
import { PageTitle } from '../layout/PageTitle'

export function NotFound() {
  return (
    <section aria-labelledby="titre-page">
      <PageTitle>Page introuvable</PageTitle>
      <p>L'adresse demandée n'existe pas dans PULSE.</p>
      <p>
        <Link to="/">Revenir à mon espace</Link>
      </p>
    </section>
  )
}
