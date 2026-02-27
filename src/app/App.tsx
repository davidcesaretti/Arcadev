import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './layout/MainLayout'
import { Hub } from './components/Hub'
import { GameRoute } from './routes/GameRoute'

export function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/game/:slug" element={<GameRoute />} />
        <Route path="*" element={<Hub />} />
      </Routes>
    </MainLayout>
  )
}
