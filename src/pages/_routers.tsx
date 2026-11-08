import { createBrowserRouter, RouteObject } from 'react-router'

import Layout from './_layout'
import { navItems } from './_navigation'
import HomePage from './home'
import PersonalConnectionsPage from './personal-connections'
import PersonalPreferencesPage from './personal-preferences'
import PersonalRemotePage from './personal-remote'
import PersonalSitesPage from './personal-sites'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { path: '/dashboard', Component: HomePage },
      { path: '/my-connections', Component: PersonalConnectionsPage },
      { path: '/preferences', Component: PersonalPreferencesPage },
      { path: '/remote-computers', Component: PersonalRemotePage },
      { path: '/sites', Component: PersonalSitesPage },
      ...navItems.map(
        (item) =>
          ({
            path: item.path,
            Component: item.Component,
          }) as RouteObject,
      ),
    ],
  },
])
