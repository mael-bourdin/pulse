import { useEffect, useRef } from 'react'

// Au premier affichage, le focus reste en haut de la page (lien « Aller au contenu ») ;
// ensuite, chaque changement de page place le focus sur le titre.
let firstPage = true

/**
 * Titre principal d'un écran : met à jour le titre de l'onglet (WCAG 2.4.2) et annonce
 * le changement de page aux lecteurs d'écran en y plaçant le focus.
 */
export function PageTitle({ children }: { children: string }) {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = `${children} – PULSE`
    if (firstPage) {
      firstPage = false
      return
    }
    heading.current?.focus()
  }, [children])

  return (
    <h1 id="titre-page" ref={heading} tabIndex={-1} className="page-title">
      {children}
    </h1>
  )
}
