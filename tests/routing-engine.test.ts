import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { describe, expect, it } from 'vitest'

import {
  compileWorkspace,
  connectionTarget,
  emptyWorkspace,
  readConnection,
  serverTarget,
} from '../src/services/routing/model'

const executable = path.resolve(
  'src-tauri/sidecar/verge-mihomo-aarch64-apple-darwin',
)

describe.skipIf(process.platform !== 'darwin' || process.arch !== 'arm64')(
  'bundled Mihomo validation',
  () => {
    it('accepts actual app rules, Tailscale exclusions and simultaneous connections', () => {
      const home = mkdtempSync(path.join(tmpdir(), 'personal-routing-'))
      const sources = [
        readConnection('first', 'First VPN', {
          proxies: [
            { name: 'London', type: 'socks5', server: '127.0.0.1', port: 1080 },
          ],
        }),
        readConnection('second', 'Second VPN', {
          proxies: [
            { name: 'London', type: 'socks5', server: '127.0.0.1', port: 1081 },
          ],
        }),
      ]
      const config = compileWorkspace(
        {
          ...emptyWorkspace(),
          sourceIds: ['first', 'second'],
          defaultTarget: connectionTarget('first'),
          routes: [
            {
              id: 'app',
              name: 'Windows App',
              match: 'app',
              value: '/Applications/Windows App.app',
              target: serverTarget('second', 'London'),
              enabled: true,
            },
          ],
        },
        sources,
      )
      const filename = path.join(home, 'config.json')
      writeFileSync(filename, JSON.stringify(config))
      expect(
        execFileSync(executable, ['-t', '-d', home, '-f', filename], {
          encoding: 'utf8',
        }),
      ).toContain('successful')
    })

    it('supports a built-in Tailscale node without issuing credentials', () => {
      const home = mkdtempSync(path.join(tmpdir(), 'personal-tailscale-'))
      const filename = path.join(home, 'config.json')
      const config = compileWorkspace(emptyWorkspace(), [
        readConnection('tail', 'Tailscale', {
          proxies: [
            {
              name: 'tail',
              type: 'tailscale',
              hostname: 'personal-routing-test',
              'state-dir': path.join(home, 'state'),
            },
          ],
        }),
      ])
      writeFileSync(filename, JSON.stringify(config))
      expect(
        execFileSync(executable, ['-t', '-d', home, '-f', filename], {
          encoding: 'utf8',
        }),
      ).toContain('successful')
    })
  },
)
