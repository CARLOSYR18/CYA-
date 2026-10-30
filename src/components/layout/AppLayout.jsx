import { useState, createContext, useContext } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export const LayoutContext = createContext({
  openSidebar: () => {},
  closeSidebar: () => {},
  sidebarOpen: false,
  isCollapsed: false,
  toggleCollapse: () => {}
})

export const useLayout = () => useContext(LayoutContext)

export default function AppLayout({ title, children, noTopbar = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('cya_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('cya_sidebar_collapsed', String(next))
      } catch {}
      return next
    })
  }

  const layoutValue = {
    openSidebar: () => setSidebarOpen(true),
    closeSidebar: () => setSidebarOpen(false),
    sidebarOpen,
    isCollapsed,
    toggleCollapse
  }

  return (
    <LayoutContext.Provider value={layoutValue}>
      <div className="min-h-screen bg-base-bg dark:bg-[#09090b] text-ink-primary dark:text-zinc-100 antialiased transition-colors duration-200">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <div
          className={`${
            isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
          } flex flex-col min-h-screen w-full transition-[padding] duration-300 ease-in-out`}
        >
          {!noTopbar && (
            <Topbar
              title={title}
              onOpenSidebar={() => setSidebarOpen(true)}
              isCollapsed={isCollapsed}
              onToggleCollapse={toggleCollapse}
            />
          )}
          <main className={`flex-1 ${noTopbar ? 'p-2.5 sm:p-5 lg:p-6' : 'p-3 sm:p-6 lg:p-8'} max-w-[1750px] w-full mx-auto transition-all`}>
            <div className="animate-slide-up">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LayoutContext.Provider>
  )
}
