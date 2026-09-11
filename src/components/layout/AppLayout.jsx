import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-base-bg text-ink-primary overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar title={title} onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="p-3.5 sm:p-6 max-w-[1400px] w-full mx-auto flex-1">{children}</main>
      </div>
    </div>
  )
}
