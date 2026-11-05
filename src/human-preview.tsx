import { mockIPC, mockWindows } from '@tauri-apps/api/mocks'
import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { SWRConfig } from 'swr'

import { initializeLanguage } from '@/services/i18n'

import './assets/styles/index.scss'

const demoSources = [
  {
    uid: 'main',
    type: 'local',
    name: 'VPN 1',
    file: 'main.yaml',
    updated: 0,
  },
  {
    uid: 'spare',
    type: 'local',
    name: 'VPN 2',
    file: 'spare.yaml',
    updated: 0,
  },
]
const demoNodes = {
  main: [
    'Великобритания · Лондон',
    'Германия · Берлин',
    'Нидерланды · Амстердам',
  ],
  spare: ['Франция · Париж', 'Германия · Франкфурт', 'Великобритания · Лондон'],
}
const demoOn = new URLSearchParams(location.search).has('on')
mockIPC((command, args) => {
  switch (command) {
    case 'get_runtime_state':
      return { mode: 'Service', isAdmin: false, tunCapable: true }
    case 'plugin:mihomo|get_base_config':
      return { tun: { enable: demoOn } }
    case 'get_clash_mode':
      return 'rule'
    case 'get_runtime_config':
      return { proxies: [] }
    case 'get_network_interfaces_info':
      return [{ name: 'utun4', addr: [{ V4: { ip: '100.101.102.103' } }] }]
    case 'get_verge_config':
      return {
        language: 'ru',
        theme_mode: 'light',
        enable_tun_mode: demoOn,
        enable_system_proxy: false,
        menu_icon: 'monochrome',
        collapse_navbar: false,
      }
    case 'get_profiles':
      return {
        current: 'demo-managed',
        items: [
          ...demoSources,
          {
            uid: 'demo-managed',
            type: 'local',
            name: 'Мои подключения',
            file: 'demo.yaml',
            updated: 0,
            desc: 'personal-routing-workspace-v1',
          },
        ],
      }
    case 'tailscale_takes_dns':
      return false
    case 'list_installed_apps':
      return [
        'Windows App',
        'Claude',
        'Google Chrome',
        'Paseo',
        'Safari',
        'Telegram',
        'Telegram 2',
        'WhatsApp',
        'Signal',
        'Mail',
        'GitHub Desktop',
        'Яндекс Музыка',
        'RustDesk',
        'Yandex',
      ].map((name) => ({ name, path: `/Applications/${name}.app` }))
    case 'read_profile_file': {
      if ((args as { index?: string })?.index === 'demo-managed')
        return JSON.stringify({
          'x-personal-routing': {
            version: 1,
            defaultTarget: 'DIRECT',
            preserveTailscale: true,
            sourceIds: ['main', 'spare'],
            routes: [
              {
                id: 'demo-claude',
                name: 'Claude',
                match: 'app',
                value: '/Applications/Claude.app',
                target:
                  'connection-main/node/' +
                  encodeURIComponent('Великобритания · Лондон'),
                enabled: true,
              },
              {
                id: 'demo-safari',
                name: 'Safari',
                match: 'app',
                value: '/Applications/Safari.app',
                target: 'connection-spare',
                enabled: true,
              },
            ],
          },
        })
      const key = (args as { index?: string })?.index as keyof typeof demoNodes
      return JSON.stringify({
        proxies: (demoNodes[key] ?? []).map((name, index) => ({
          name,
          type: 'socks5',
          server: '127.0.0.1',
          port: 18080 + index,
        })),
      })
    }
    default:
      throw new Error('Это просмотр интерфейса. Сеть Mac не меняется.')
  }
})
mockWindows('main')
const { default: PreviewLayout } = await import(
  '@/components/routing/preview-layout'
)
const { default: PersonalConnectionsPage } = await import(
  '@/pages/personal-connections'
)
const { default: PersonalPreferencesPage } = await import(
  '@/pages/personal-preferences'
)
const { default: PersonalRemotePage } = await import('@/pages/personal-remote')
const { default: PersonalRoutingPage } = await import(
  '@/pages/personal-routing'
)
await initializeLanguage('ru')
const router = createMemoryRouter([
  {
    path: '/',
    Component: PreviewLayout,
    children: [
      { index: true, Component: PersonalRoutingPage },
      { path: 'my-connections', Component: PersonalConnectionsPage },
      { path: 'remote-computers', Component: PersonalRemotePage },
      { path: 'preferences', Component: PersonalPreferencesPage },
    ],
  },
])
createRoot(document.getElementById('preview-root')!).render(
  <SWRConfig value={{ shouldRetryOnError: false, revalidateOnFocus: false }}>
    <RouterProvider router={router} />
  </SWRConfig>,
)
