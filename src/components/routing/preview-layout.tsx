import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { Outlet } from 'react-router'

import { LayoutSidebar } from '@/components/layout/layout-sidebar'

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#1768c4' } },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    button: { textTransform: 'none' },
  },
  shape: { borderRadius: 10 },
})
export default function PreviewLayout() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div
        style={{
          height: 28,
          background: '#fff4ce',
          fontSize: 12,
          textAlign: 'center',
          lineHeight: '28px',
        }}
      >
        Демонстрационные VPN и страны. Этот просмотр не меняет сеть Mac.
      </div>
      <div className="layout" style={{ height: 'calc(100vh - 28px)' }}>
        <div className="layout-content">
          <LayoutSidebar isDark={false} isCollapsed={false} />
          <div className="layout-content__right">
            <div className="the-content" style={{ height: '100%' }}>
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
