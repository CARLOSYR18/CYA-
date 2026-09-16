import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-base-bg text-ink-primary overflow-x-hidden antialiased">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar title={title} onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <div className="animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
