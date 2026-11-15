import React from 'react'

/**
 * PageHeaderBadge - Ultra-crisp, 100% vector SVG badges for ERP module headers.
 * Replaces plain stroke icons with multi-tone gradient vector graphics.
 */
export default function PageHeaderBadge({ type = 'sales', className = '' }) {
  return (
    <div
      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 p-2.5 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/20 shrink-0 group hover:scale-105 transition-transform duration-200 select-none ${className}`}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          {/* Universal metallic & ice-blue gradients */}
          <linearGradient id="phbWhiteGrad" x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#DCEBFE" />
          </linearGradient>

          <linearGradient id="phbFillGrad" x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="phbWheelGrad" x1="16" y1="34" x2="24" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#BFDBFE" />
          </linearGradient>

          <linearGradient id="phbGoldSparkle" x1="28" y1="6" x2="38" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#FACC15" />
          </linearGradient>

          <filter id="phbDrop" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* ═══ 1. SALES / CARRITO DE VENTAS ═══ */}
        {type === 'sales' && (
          <g filter="url(#phbDrop)">
            {/* Cart Rail */}
            <path
              d="M6 10H11.2L15.4 27.2C15.7 28.5 16.8 29.5 18.2 29.5H34.8C36.1 29.5 37.3 28.5 37.6 27.2L40.5 15.5H12.8"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Basket Body */}
            <path
              d="M13.2 16.5H38.8L36.6 26.6C36.4 27.4 35.7 28 34.8 28H18.2C17.3 28 16.6 27.4 16.4 26.6L13.2 16.5Z"
              fill="url(#phbFillGrad)"
            />
            {/* Mesh Lines */}
            <line x1="20" y1="17.5" x2="21.5" y2="27" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.75" strokeLinecap="round" />
            <line x1="26" y1="17.5" x2="27" y2="27" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.75" strokeLinecap="round" />
            <line x1="32" y1="17.5" x2="32.5" y2="27" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.75" strokeLinecap="round" />
            <line x1="15" y1="22" x2="37.5" y2="22" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
            {/* Wheels */}
            <circle cx="19" cy="37.5" r="3.5" fill="url(#phbWheelGrad)" />
            <circle cx="19" cy="37.5" r="1.5" fill="#1E40AF" />
            <circle cx="34" cy="37.5" r="3.5" fill="url(#phbWheelGrad)" />
            <circle cx="34" cy="37.5" r="1.5" fill="#1E40AF" />
            {/* Sparkle */}
            <path d="M34 6L35 8.5L37.5 9.5L35 10.5L34 13L33 10.5L30.5 9.5L33 8.5L34 6Z" fill="url(#phbGoldSparkle)" />
          </g>
        )}

        {/* ═══ 2. CLIENTS / CARTERA & CRM ═══ */}
        {type === 'clients' && (
          <g filter="url(#phbDrop)">
            {/* Secondary user (behind right) */}
            <circle cx="32" cy="17" r="5" stroke="url(#phbWhiteGrad)" strokeWidth="2.2" fill="url(#phbFillGrad)" />
            <path
              d="M26 35C26.5 30.8 29.5 28 34 28C37.5 28 40.5 30.2 41.5 34"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Primary user (front left) */}
            <circle cx="19" cy="15" r="6.5" stroke="url(#phbWhiteGrad)" strokeWidth="2.6" fill="url(#phbFillGrad)" />
            <path
              d="M8.5 36C9 29.8 13.5 26 19 26C24.5 26 29 29.8 29.5 36"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Chest badge fill */}
            <path
              d="M10.8 35.5C11.5 30.8 15 28 19 28C23 28 26.5 30.8 27.2 35.5H10.8Z"
              fill="url(#phbFillGrad)"
            />

            {/* Loyalty Star Sparkle */}
            <path d="M35 7.5L36 10L38.5 11L36 12L35 14.5L34 12L31.5 11L34 10L35 7.5Z" fill="url(#phbGoldSparkle)" />
          </g>
        )}

        {/* ═══ 3. PRODUCTS / CATÁLOGO & INVENTARIO ═══ */}
        {type === 'products' && (
          <g filter="url(#phbDrop)">
            {/* 3D Isometric Cube / Product Box */}
            {/* Top face */}
            <path
              d="M24 7L38 15L24 23L10 15L24 7Z"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.4"
              fill="url(#phbFillGrad)"
              strokeLinejoin="round"
            />
            {/* Left face */}
            <path
              d="M10 15.5L24 23.5V39L10 31V15.5Z"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.4"
              fill="#FFFFFF"
              fillOpacity="0.12"
              strokeLinejoin="round"
            />
            {/* Right face */}
            <path
              d="M24 23.5L38 15.5V31L24 39V23.5Z"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.4"
              fill="#1D4ED8"
              fillOpacity="0.25"
              strokeLinejoin="round"
            />
            {/* Center vertical seam */}
            <line x1="24" y1="23.5" x2="24" y2="39" stroke="url(#phbWhiteGrad)" strokeWidth="2.4" strokeLinecap="round" />
            {/* Packaging Tape on top */}
            <line x1="17" y1="11" x2="31" y2="19" stroke="#93C5FD" strokeWidth="2" strokeOpacity="0.8" strokeLinecap="round" />
            {/* Sparkle */}
            <path d="M37 6L38 8.5L40.5 9.5L38 10.5L37 13L36 10.5L33.5 9.5L36 8.5L37 6Z" fill="url(#phbGoldSparkle)" />
          </g>
        )}

        {/* ═══ 4. CATEGORIES / CATEGORÍAS & FAMILIAS ═══ */}
        {type === 'categories' && (
          <g filter="url(#phbDrop)">
            {/* Background secondary tag */}
            <path
              d="M20 9H29L39 19L31 27L20 16V9Z"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2"
              strokeOpacity="0.6"
              fill="#FFFFFF"
              fillOpacity="0.1"
            />
            {/* Primary tag */}
            <path
              d="M11 15H23.5L35 26.5C36 27.5 36 29 35 30L29 36C28 37 26.5 37 25.5 36L14 24.5V18C14 16.3 12.7 15 11 15Z"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.6"
              fill="url(#phbFillGrad)"
              strokeLinejoin="round"
            />
            {/* Tag hole */}
            <circle cx="18" cy="20" r="2.5" fill="url(#phbWhiteGrad)" />
            <circle cx="18" cy="20" r="1.2" fill="#1E40AF" />
            {/* Price badge line */}
            <line x1="24" y1="26" x2="30" y2="32" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.8" />
            {/* Sparkle */}
            <path d="M33 7.5L34 10L36.5 11L34 12L33 14.5L32 12L29.5 11L32 10L33 7.5Z" fill="url(#phbGoldSparkle)" />
          </g>
        )}

        {/* ═══ 5. PURCHASES / COMPRAS & ABASTECIMIENTO ═══ */}
        {type === 'purchases' && (
          <g filter="url(#phbDrop)">
            {/* Cargo container */}
            <rect
              x="6"
              y="13"
              width="23"
              height="18"
              rx="2.5"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.5"
              fill="url(#phbFillGrad)"
            />
            {/* Container ribbed lines */}
            <line x1="12" y1="16" x2="12" y2="28" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
            <line x1="18" y1="16" x2="18" y2="28" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
            <line x1="24" y1="16" x2="24" y2="28" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />

            {/* Truck cabin */}
            <path
              d="M29 20H37.5L42 26V31H29V20Z"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.5"
              fill="#FFFFFF"
              fillOpacity="0.18"
              strokeLinejoin="round"
            />
            {/* Windshield */}
            <path d="M33 22H36.5L39.5 26H33V22Z" fill="#93C5FD" fillOpacity="0.65" />

            {/* Headlight beam dot */}
            <circle cx="41.5" cy="28.5" r="1.2" fill="#FDE047" />

            {/* Wheels */}
            <circle cx="14" cy="33.5" r="4" fill="url(#phbWheelGrad)" />
            <circle cx="14" cy="33.5" r="1.8" fill="#1E40AF" />

            <circle cx="36" cy="33.5" r="4" fill="url(#phbWheelGrad)" />
            <circle cx="36" cy="33.5" r="1.8" fill="#1E40AF" />
          </g>
        )}

        {/* ═══ 6. SUPPLIERS / PROVEEDORES & ALIANZAS ═══ */}
        {type === 'suppliers' && (
          <g filter="url(#phbDrop)">
            {/* Corporate building / Supplier Facility */}
            <path
              d="M10 38V12C10 10.5 11 9.5 12.5 9.5H27.5C29 9.5 30 10.5 30 12V38H10Z"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.6"
              fill="url(#phbFillGrad)"
            />
            {/* Windows in main building */}
            <rect x="14" y="14" width="4" height="4" rx="0.8" fill="#93C5FD" fillOpacity="0.85" />
            <rect x="22" y="14" width="4" height="4" rx="0.8" fill="#93C5FD" fillOpacity="0.85" />
            <rect x="14" y="21" width="4" height="4" rx="0.8" fill="#93C5FD" fillOpacity="0.85" />
            <rect x="22" y="21" width="4" height="4" rx="0.8" fill="#93C5FD" fillOpacity="0.85" />

            {/* Warehouse side wing with awning */}
            <path
              d="M30 20H39C40.5 20 41.5 21 41.5 22.5V38H30V20Z"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.4"
              fill="#FFFFFF"
              fillOpacity="0.15"
            />
            {/* Shutter door */}
            <rect x="16" y="29" width="8" height="9" rx="1" fill="#FFFFFF" fillOpacity="0.9" />
            <rect x="33" y="27" width="6" height="11" rx="0.8" fill="#93C5FD" fillOpacity="0.5" />

            {/* Verified Partnership Sparkle */}
            <path d="M34 7L35 9.5L37.5 10.5L35 11.5L34 14L33 11.5L30.5 10.5L33 9.5L34 7Z" fill="url(#phbGoldSparkle)" />
          </g>
        )}

        {/* ═══ 7. MOVEMENTS / KARDEX & MOVIMIENTOS ═══ */}
        {type === 'movements' && (
          <g filter="url(#phbDrop)">
            {/* Top right-pointing arrow (ingreso/egreso) */}
            <path
              d="M10 18H34M34 18L26 11M34 18L26 25"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Bottom left-pointing arrow */}
            <path
              d="M38 31H14M14 31L22 24M14 31L22 38"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Glowing sync center hub */}
            <circle cx="24" cy="24.5" r="3" fill="url(#phbGoldSparkle)" />
          </g>
        )}

        {/* ═══ 8. USERS / USUARIOS Y ROLES (RBAC) ═══ */}
        {type === 'users' && (
          <g filter="url(#phbDrop)">
            {/* User Avatar */}
            <circle cx="22" cy="15" r="6.5" stroke="url(#phbWhiteGrad)" strokeWidth="2.6" fill="url(#phbFillGrad)" />
            <path
              d="M10 36C10.5 29.5 15.5 26 22 26C24 26 25.8 26.4 27.5 27.1"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Security Gear / Shield Badge on bottom-right */}
            <circle cx="34" cy="32" r="7" stroke="url(#phbWhiteGrad)" strokeWidth="2.2" fill="#1E40AF" />
            <path
              d="M31 32L33.5 34.5L37.5 29.5"
              stroke="url(#phbGoldSparkle)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Sparkle */}
            <path d="M36 7L37 9.5L39.5 10.5L37 11.5L36 14L35 11.5L32.5 10.5L35 9.5L36 7Z" fill="url(#phbGoldSparkle)" />
          </g>
        )}

        {/* ═══ 9. ACTIVITY / MOVIMIENTOS EMPLEADOS (AUDITORÍA) ═══ */}
        {type === 'activity' && (
          <g filter="url(#phbDrop)">
            {/* Pulse monitor grid */}
            <path
              d="M7 25H15L19 14L25 35L29 21L33 27H41"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Pulse peak point */}
            <circle cx="25" cy="35" r="3.2" fill="url(#phbGoldSparkle)" />
            <circle cx="19" cy="14" r="3.2" fill="#67E8F9" />
          </g>
        )}

        {/* ═══ 10. NOTIFICATIONS / NOTIFICACIONES ═══ */}
        {type === 'notifications' && (
          <g filter="url(#phbDrop)">
            {/* Bell contour */}
            <path
              d="M24 8C20 8 16 11 16 16V24L12 28V30H36V28L32 24V16C32 11 28 8 24 8Z"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.6"
              fill="url(#phbFillGrad)"
              strokeLinejoin="round"
            />
            {/* Clapper */}
            <path d="M21 32C21.5 34 22.5 35 24 35C25.5 35 26.5 34 27 32" stroke="url(#phbWhiteGrad)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Top hook */}
            <circle cx="24" cy="7" r="2" stroke="url(#phbWhiteGrad)" strokeWidth="1.8" />
            {/* Notification alert dot on right shoulder */}
            <circle cx="33" cy="14" r="3.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
          </g>
        )}

        {/* ═══ 11. SETTINGS / CONFIGURACIÓN ═══ */}
        {type === 'settings' && (
          <g filter="url(#phbDrop)">
            {/* Precision Mechanical Gear */}
            <path
              d="M24 16C19.6 16 16 19.6 16 24C16 28.4 19.6 32 24 32C28.4 32 32 28.4 32 24C32 19.6 28.4 16 24 16Z"
              stroke="url(#phbWhiteGrad)"
              strokeWidth="2.6"
              fill="url(#phbFillGrad)"
            />
            <circle cx="24" cy="24" r="3.8" fill="url(#phbWhiteGrad)" />
            {/* Cogs */}
            <line x1="24" y1="9" x2="24" y2="14" stroke="url(#phbWhiteGrad)" strokeWidth="3" strokeLinecap="round" />
            <line x1="24" y1="34" x2="24" y2="39" stroke="url(#phbWhiteGrad)" strokeWidth="3" strokeLinecap="round" />
            <line x1="9" y1="24" x2="14" y2="24" stroke="url(#phbWhiteGrad)" strokeWidth="3" strokeLinecap="round" />
            <line x1="34" y1="24" x2="39" y2="24" stroke="url(#phbWhiteGrad)" strokeWidth="3" strokeLinecap="round" />
            <line x1="13.5" y1="13.5" x2="17" y2="17" stroke="url(#phbWhiteGrad)" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="31" y1="31" x2="34.5" y2="34.5" stroke="url(#phbWhiteGrad)" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="34.5" y1="13.5" x2="31" y2="17" stroke="url(#phbWhiteGrad)" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="17" y1="31" x2="13.5" y2="34.5" stroke="url(#phbWhiteGrad)" strokeWidth="2.8" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  )
}
