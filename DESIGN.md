---
name: G Verge
description: Existing Clash Verge Rev desktop utility with a simplified personal VPN workflow.
colors:
  primary: "#007AFF"
  primary-dark-mode: "#0A84FF"
  secondary: "#FC9B76"
  secondary-dark-mode: "#FF9F0A"
  text-primary: "#000000"
  text-primary-dark-mode: "#FFFFFF"
  text-secondary: "#3C3C4399"
  text-secondary-dark-mode: "#EBEBF599"
  paper: "#F5F5F5"
  paper-dark-mode: "#2E303D"
  page: "#ECECEC"
  page-dark-mode: "#1e1f27"
  white: "#ffffff"
  error: "#FF3B30"
  error-dark-mode: "#FF453A"
  warning: "#FF9500"
  warning-dark-mode: "#FF9F0A"
  success: "#06943D"
  success-dark-mode: "#30D158"
  shell-divider: "rgba(0, 0, 0, 0.06)"
  shell-divider-dark-mode: "rgba(255, 255, 255, 0.06)"
  row-divider: "rgba(0, 0, 0, 0.12)"
  row-divider-dark-mode: "rgba(255, 255, 255, 0.12)"
typography:
  page-title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Microsoft YaHei UI", "Microsoft YaHei", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji"'
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.5
  section-title:
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.6
  body:
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.75
  caption:
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.66
rounded:
  control: "4px"
  navigation: "8px"
spacing:
  half: "4px"
  one: "8px"
  one-and-half: "12px"
  two: "16px"
  three: "24px"
  four: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "6px 16px"
  button-outlined:
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "5px 15px"
  button-text:
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    padding: "6px 8px"
  route-select:
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    width: "260px"
  navigation-item:
    typography: "{typography.body}"
    rounded: "{rounded.navigation}"
---

# Design System: G Verge

## Overview

G Verge retains the existing Clash Verge Rev desktop world. The owner chose the name and asked to simplify the existing MUI application. No separate creative metaphor or replacement visual identity is established.

The interface is a practical desktop utility. A persistent sidebar leads to clear task pages. Plain rows keep decisions easy to compare; short explanations describe their effects. Existing icons remain functional navigation aids.

Key characteristics:

- Native system typography with inherited MUI controls.
- Blue actions against neutral surfaces.
- Flat sections with explicit state messages.

Visual authority is `src/pages/_theme.tsx`, `src/pages/_layout/hooks/use-custom-theme.ts`, the base page and layout sources, then installed MUI defaults. These tokens record native defaults; user theme overrides remain supported.

Review evidence is in `.impeccable/review/`: `programs.png`, `vpn-list.png`, `add-vpn.png`, `remote.png`, `preferences.png` and `vpn-explicit-save.png`. These show the same components with explicitly labeled synthetic VPN and country data. They establish composition and review states, not real credentials or verified networking. `src/components/routing/preview-layout.tsx` supplies a test-only theme. Its accent, larger corner radius and sentence-case buttons are not native defaults. Dark mode is documented from source; these light preview images do not prove native dark rendering.

## Colors

The palette uses a blue functional accent with neutral desktop surfaces. Tokens ending in `dark-mode` are dark theme counterparts, not hover shades.

### Primary

`primary` drives actions, selected controls and information messages. MUI derives hover shades from the active palette. Selected sidebar backgrounds use primary alpha (0.15 light, 0.35 dark).

### Secondary

The warm secondary accent is inherited upstream. The ordinary routing pages mainly use primary; do not add accent decoration just to fill space.

### Neutral

Primary and secondary text distinguish instructions from supporting explanations. `paper` is the MUI paper/default surface; `page` is the runtime CSS page background. Base-page light containers use white, with the section using the page background. Dark containers and sections use the dark page surface. Light dialogs are white; dark dialogs use dark paper. Shell separators and MUI row dividers intentionally have different opacity.

Error, warning and success tokens express outcomes; information shares primary. Status also needs readable words. Color alone does not confirm that routing is active.

**Theme source rule.** Native light/dark colors come from `_theme.tsx`. In system mode Tauri reads the OS theme and listens for changes; the native window follows the OS. Preferences show «Как в macOS», «Светлый» and «Темный».

## Typography

Every role inherits the page-title font stack. On macOS it starts with the Apple system font. Windows additionally appends `twemoji mozilla`. A configured user font is prepended. There is no separate display font.

Page titles use the bold base-page role; section headings use MUI `h6`. Application names use body size with semibold weight (600). Explanations use `body2`; paths and low-priority status use `caption`. Native MUI buttons retain uppercase transformation; the preview harness removes it only for review.

Body prose is left aligned. Several remote and preference explanations are capped at about 70 characters per line in source. Labels describe the actual decision and name the relevant application. Russian copy uses `е` and avoids unexplained upstream identifiers in ordinary controls.

## Layout

The shell fills the desktop window. Its sidebar starts with a flex basis (200px), a logo area (76px) and a scrolling menu. The base page header has fixed height (58px) with horizontal inset (20px). The scrolling section uses vertical inset (10px), while its content subtracts horizontal insets (10px per side).

Program and VPN content caps at 960px; remote and preference pages cap at 900px. These stacks center horizontally and use the three-step spacing token, with four-step bottom padding. Application rows use two-step vertical padding and bottom dividers. Route controls have width (260px) at `sm` and above; below that they fill the width and the row stacks vertically. Native breakpoints are recorded in the sidecar.

The upstream collapsed sidebar remains available (72px), with icon cells (52px) and accessible names. Responsive form rows do not imply a separate mobile navigation system.

## Elevation & Depth

The regular native theme sets every MUI shadow to `none`. Injected global styles also suppress box shadows. Tone changes and dividers distinguish surfaces. Dialogs use their backdrop and a distinct surface, not decorative card elevation. A drag-state shadow exception exists in the global stylesheet; it does not establish a general card style.

The fallback theme omits the shadow array if construction fails, but global shadow suppression still applies.

## Shapes

Native controls inherit the MUI control radius. Sidebar items multiply it by two. The global CSS radius variable (8px) remains an upstream token; it does not replace the MUI control radius. The preview's shape base (10px) is test-only.

Outlined fields and thin dividers carry structure. Ordinary screens use simple sections rather than a decorative card grid. Retain the upstream logo asset.

## Components

### Buttons

Contained buttons mark principal operations. Outlined and text buttons serve secondary actions. Keep MUI hover and pressed behavior, disabled states and progress labels such as «Сохраняю…».

The native source globally suppresses outlines and shadows. Do not claim that a custom keyboard focus ring exists. Outlined fields still change their focused border. Sidecar snippets record the current treatment; they do not introduce a replacement focus system.

### Inputs / Fields

Use MUI outlined fields with persistent labels. Routing uses small fields; VPN import uses standard fields. The named VPN selector and the separate «Страна и подключение» selector are distinct decisions. The second appears when that VPN has available nodes; it can inherit the default chosen in «Мои VPN».

VPN import asks for «Название VPN» and «Ссылка от VPN-сервиса». The subscription link is a password field with autocomplete disabled. Preserve its local-storage explanation and validation errors. Show load failure separately from an empty successful list.

### Navigation

Retain the sidebar order: «Программы», «Мои VPN», «Удаленные компьютеры», «Настройки». Selected items use the existing tonal primary background and bold text. Technical upstream navigation stays collapsed under «Для специалиста». A lower status block explains confirmed routing state.

### Sections and alerts

Use dividers between simple sections and program rows. MUI alerts carry outcomes, load errors and unsaved changes. Loading has a readable accessible label. An unavailable VPN stays explicit in a disabled option rather than silently changing a user's choice. The four ordinary screens do not establish a reusable card or chip primitive.

### Explicit save

Changing application routes, VPN countries or the Tailscale preservation choice updates a draft. «Сохранить выбор» commits that draft. On «Мои VPN» the unsaved alert exposes the save action. Selecting a country must not imply that it is already active. Import uses its own «Добавить VPN» submission.

Theme and auto-launch controls apply their preference changes directly. Do not extend the route-save rule to those controls.

## Do's and Don'ts

### Do:

- Do reuse the actual MUI theme and existing shell components.
- Do show a named VPN separately from its country or connection.
- Do explain inactive routing and unsaved changes in readable Russian.
- Do retain native light, dark and system behavior.

### Don't:

- Don't promote the preview harness into native visual authority.
- Don't expose profiles, scripts or merge configuration in ordinary navigation.
- Don't show DIRECT/REJECT identifiers as ordinary choices.
- Don't claim a changed selector is already saved or active.
- Don't add a replacement identity or decorative card system during this simplification.
