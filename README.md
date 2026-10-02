# Qwantarc

The source for two sites, built as one static [Astro](https://astro.build) project and deployed on Vercel:

| Host                     | Pages            | What it is                                       |
| ------------------------ | ---------------- | ------------------------------------------------ |
| `qwantarc.com`           | `/`              | The brand site                                   |
| `developer.qwantarc.com` | `/design/**`     | Developer: design hub and Qwantarc Interface Guidelines (QIG) |

`vercel.json` sends `developer.qwantarc.com/` to `/design`, and `qwantarc.com/design/**` to the developer host.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321 — the brand site at /, the guidelines at /design/qig
npm run build      # static output in dist/
```

## Qwantarc Interface Guidelines

QIG is Qwantarc's own design system, written for any platform and any technology. Each page is one Markdown file in
`src/content/qig/<section>/`, with `title`, `section`, `summary` and, for components, `group` and `order` in its front
matter. Rule numbers link to `/design/qig/rules#rN`.

When a page changes in a way readers should know about, add a row to `src/content/qig/resources/whats-new.md`.

| Path                          | Holds                                                     |
| ----------------------------- | --------------------------------------------------------- |
| `src/content/qig/`            | Every guidelines page, in a folder per section            |
| `src/lib/qig.ts`              | Sections, their colours, the sidebar order, the edition date |
| `src/components/QigArt.astro` | The generated arc artwork on every page                   |
| `src/layouts/QigLayout.astro` | Global nav, local nav, sidebar with filter, footer        |
| `src/styles/qig.css`          | Developer-site styles                                     |
| `src/pages/index.astro`       | The brand site                                            |
