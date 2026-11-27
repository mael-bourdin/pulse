// Page provisoire : chaque fonctionnalité remplace la sienne (voir spec/features/).
export function Placeholder({ title, ticket }: { title: string; ticket: string }) {
  return (
    <section aria-labelledby="titre-page">
      <h1 id="titre-page">{title}</h1>
      <p className="muted">Écran à venir ({ticket}).</p>
    </section>
  )
}
