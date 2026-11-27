import type { ReactNode } from 'react'

/** Lien d'évitement et zone principale, communs à toutes les pages (spec/accessibility.md). */
export function Shell({ header, children }: { header?: ReactNode; children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      {header}
      <main id="contenu" tabIndex={-1} className="content">
        {children}
      </main>
    </>
  )
}
