# @rotorsoft/act-nvim

Neovim plugin that renders interactive [Act](https://github.com/Rotorsoft/act-root) event-sourcing diagrams in your browser with bidirectional navigation.

Click a node in the diagram and Neovim jumps to the source. Edit code and the diagram updates live.

## Install

### Prerequisites

- Node.js >= 22.18.0
- pnpm >= 10.32.1
- Neovim >= 0.10

### Native pack

```bash
git clone https://github.com/Rotorsoft/act-nvim.git \
  ~/.local/share/nvim/site/pack/act/start/act-nvim
cd ~/.local/share/nvim/site/pack/act/start/act-nvim
pnpm install
```

The `postinstall` script builds the relay server and browser client automatically.

### Neovim config

Add to your `init.lua`:

```lua
require("act-nvim").setup()
```

## Usage

Open any Act project and run:

```vim
:ActDiagram ~/Projects/act/packages/wolfdesk
```

The plugin automatically:
- Starts the relay server
- Scans all `.ts` files in the target directory
- Opens the diagram in your default browser
- Updates live as you type (500ms debounce)
- Stops the relay when you quit Neovim

Switch projects without restarting:

```vim
:ActDiagram ~/Projects/act/packages/calculator
```

Stop manually:

```vim
:ActDiagramClose
```

## Configuration

```lua
require("act-nvim").setup({
  tcp_port = 4011,
  http_port = 4010,
  auto_refresh = true,
})
```

## Architecture

```
Neovim (Lua) <--TCP--> Node.js Relay <--WebSocket--> Browser (React)
   :4011                  :4010                        ActDiagram
```

- **Relay server** — serves the diagram SPA, bridges Neovim and browser, watches filesystem
- **Browser client** — interactive SVG diagram from `@rotorsoft/act-diagram`
- **Lua plugin** — manages relay lifecycle, sends file updates, handles navigation

## Development

### Working with a local act monorepo

If you have the [act monorepo](https://github.com/Rotorsoft/act-root) cloned as a sibling directory (`../act/`), the setup script auto-detects it and configures pnpm to use your local `@rotorsoft/act-diagram` instead of the published version:

```
~/Projects/
├── act/              ← act monorepo (with libs/act-diagram)
└── act-nvim/         ← this repo
```

```bash
cd ~/Projects/act-nvim
pnpm install        # auto-detects ../act/libs/act-diagram and links it
pnpm build          # builds with local act-diagram
```

The `postinstall` script runs `scripts/setup.mjs` which:
1. Checks if `../act/libs/act-diagram` exists
2. If yes — adds a `pnpm.overrides` entry to use the local version
3. Builds `act-diagram` if needed
4. Builds `act-nvim`

To rebuild after changing act-diagram:

```bash
cd ~/Projects/act && pnpm -F @rotorsoft/act-diagram build
cd ~/Projects/act-nvim && pnpm build
```

### Without the local monorepo

```bash
pnpm install    # installs @rotorsoft/act-diagram from npm
pnpm build
```

### Scripts

| Script | Description |
|---|---|
| `pnpm build` | Build relay server + browser client |
| `pnpm start` | Start the relay server |
| `pnpm dev` | Start relay in watch mode (for plugin development) |
| `pnpm nvim [path]` | Launch Neovim with plugin loaded |
| `pnpm setup` | Re-run setup (auto-detect local monorepo) |

## License

MIT
