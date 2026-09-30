import { Outlet, NavLink } from 'react-router-dom'
import { CheckSquare, Settings, Book, BarChart3 } from 'lucide-react'

export default function Layout() {
  const navItems = [
    { to: '/checklist', icon: CheckSquare, label: 'Daily' },
    { to: '/journal', icon: Book, label: 'Journal' },
    { to: '/progress', icon: BarChart3, label: 'Progress' },
    { to: '/habits', icon: Settings, label: 'Habits' },
  ]

  return (
    <div className="min-h-screen bg-arc-bg text-arc-text pb-20">
      <header className="px-4 py-4 border-b border-arc-panel flex justify-center items-center bg-black/80 backdrop-blur sticky top-0 z-10">
        <h1 className="text-xl font-bold uppercase tracking-wider text-arc-text">Winter Arc</h1>
      </header>

      <main className="max-w-md mx-auto w-full p-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-arc-panel border-t border-arc-muted/20 pb-safe">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center p-2 text-xs transition-colors ${
                  isActive ? 'text-arc-green' : 'text-arc-muted hover:text-arc-text'
                }`
              }
            >
              <Icon size={24} className="mb-1" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
