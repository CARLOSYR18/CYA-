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

export default function AppLayout({ title, children, noTopbar = false, noPadding = false }) {
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
      {/* Sidebar fijo e independiente de cualquier contenedor de contenido */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="min-h-screen bg-base-bg dark:bg-[#09090b] text-ink-primary dark:text-zinc-100 antialiased transition-colors duration-200">
        <div
          className={`${
            isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[270px]'
          } flex flex-col min-h-screen w-full min-w-0 max-w-full overflow-x-hidden transition-[padding] duration-300 ease-in-out`}
        >
          {!noTopbar && (
            <Topbar
              title={title}
              onOpenSidebar={() => setSidebarOpen(true)}
              isCollapsed={isCollapsed}
              onToggleCollapse={toggleCollapse}
            />
          )}
          <main className={`flex-1 ${noPadding ? '' : noTopbar ? 'p-2.5 sm:p-5 lg:p-6' : 'p-3 sm:p-6 lg:p-8'} ${noPadding ? 'w-full' : 'max-w-[1750px] w-full mx-auto'} min-w-0 transition-all`}>
            <div className="animate-slide-up min-w-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LayoutContext.Provider>
  )
}
