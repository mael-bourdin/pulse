import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './layout/Layout'
import { NotFound } from './pages/NotFound'
import { Placeholder } from './pages/Placeholder'

// Aucune mise en cache longue : la session et les données viennent toujours de l'API (ADR-10).
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
})

// Routes de spec/features/. Les gardes de session et de rôle arrivent avec F1-R41.
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/connexion" element={<Placeholder title="Connexion" ticket="F1-R40 à R43" />} />
          <Route path="/acces-refuse" element={<Placeholder title="Droits insuffisants" ticket="F1-R41" />} />
          <Route path="/admin/*" element={<Placeholder title="Administration PULSE" ticket="F6" />} />
          <Route element={<Layout />}>
            <Route index element={<Placeholder title="Mon espace" ticket="F5" />} />
            <Route path="objectifs" element={<Placeholder title="Mes objectifs" ticket="F3" />} />
            <Route path="defis" element={<Placeholder title="Défis" ticket="F4" />} />
            <Route path="defis/:challengeId" element={<Placeholder title="Défi" ticket="F4" />} />
            <Route path="progression" element={<Placeholder title="Ma progression" ticket="F5" />} />
            <Route path="preferences" element={<Placeholder title="Mes préférences" ticket="F2" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
