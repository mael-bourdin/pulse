import { Link } from 'react-router'

export function NotFound() {
  return (
    <section aria-labelledby="titre-page">
      <h1 id="titre-page">Page introuvable</h1>
      <p>L'adresse demandée n'existe pas dans PULSE.</p>
      <p>
        <Link to="/">Revenir à mon espace</Link>
      </p>
    </section>
  )
}
