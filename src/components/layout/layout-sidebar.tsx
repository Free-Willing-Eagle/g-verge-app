import {
  AppsRounded,
  ComputerOutlined,
  SettingsOutlined,
  WifiOutlined,
} from '@mui/icons-material'
import { Box, List, SvgIcon, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import iconDark from '@/assets/image/icon_dark.svg?react'
import iconLight from '@/assets/image/icon_light.svg?react'
import { PowerButton } from '@/components/routing/power-button'
import { navItems } from '@/pages/_navigation'
import { sharedEdition } from '@/services/routing/platform'

import { LayoutItem } from './layout-item'

interface LayoutSidebarProps {
  isDark: boolean
  isCollapsed: boolean
}

export const LayoutSidebar = ({ isDark, isCollapsed }: LayoutSidebarProps) => {
  const { t } = useTranslation()
  return (
    <div className="layout-content__left">
      <div
        className="the-logo"
        data-tauri-drag-region="true"
        style={{ flex: '0 0 76px', height: 76, padding: '0 20px' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box style={{ width: 40, height: 40, flex: '0 0 40px' }}>
            <SvgIcon component={isDark ? iconDark : iconLight} inheritViewBox />
          </Box>
          {!isCollapsed && (
            <Typography
              sx={{ fontSize: 23, fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              G Verge
            </Typography>
          )}
        </Box>
      </div>
      <PowerButton compact={isCollapsed} />
      <List className="the-menu">
        <LayoutItem
          to="/"
          icon={[<AppsRounded key="app" />, <AppsRounded key="app-alt" />]}
        >
          Программы
        </LayoutItem>
        <LayoutItem
          to="/my-connections"
          icon={[<WifiOutlined key="vpn" />, <WifiOutlined key="vpn-alt" />]}
        >
          Мои VPN
        </LayoutItem>
        {!sharedEdition && (
          <LayoutItem
            to="/remote-computers"
            icon={[
              <ComputerOutlined key="remote" />,
              <ComputerOutlined key="remote-alt" />,
            ]}
          >
            Удаленные компьютеры
          </LayoutItem>
        )}
        <LayoutItem
          to="/preferences"
          icon={[
            <SettingsOutlined key="settings" />,
            <SettingsOutlined key="settings-alt" />,
          ]}
        >
          Настройки
        </LayoutItem>
        <Box component="details" sx={{ px: 2, mt: 3 }}>
          <Typography
            component="summary"
            variant="body2"
            sx={{ cursor: 'pointer', color: 'text.secondary', py: 1 }}
          >
            Для специалиста
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Для обычного выбора VPN эти настройки не нужны.
          </Typography>
          {navItems
            .filter((item) => item.path !== '/')
            .map((item) => (
              <LayoutItem key={item.path} to={item.path} icon={item.icon}>
                {t(item.label)}
              </LayoutItem>
            ))}
          <LayoutItem to="/dashboard" icon={navItems[0].icon}>
            Технический обзор
          </LayoutItem>
        </Box>
      </List>
    </div>
  )
}
