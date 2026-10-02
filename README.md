# antigravity-google-drive

English | [繁體中文](README.zh-TW.md)

Google Drive integration plugin for Google Antigravity, providing secure, read-only access to Google Drive folders and files shared with a dedicated Google Cloud Service Account. Features smart document conversion (Google Docs to Markdown/plain text, Google Sheets to CSV tables), full-text search, and automated environment diagnostics.

Comprehensive support across the three core platforms of Google Antigravity (AGY): Antigravity Command-Line Interface (CLI) (`agy`), Antigravity Integrated Development Environment (IDE), and Antigravity 2.0 Desktop Application.

## Installation

Install the plugin globally using the Antigravity Command-Line Interface (CLI):

```bash
agy plugin install https://github.com/AndyAWD/antigravity-google-drive
```

Or symlink locally during development:

```bash
mkdir -p ~/.gemini/config/plugins
ln -sfn /Users/a00911914/Project/antigravity-google-drive ~/.gemini/config/plugins/antigravity-google-drive
```

## Key Features

1. **Seamless Cross-Platform Compatibility**: Fully compatible with Antigravity CLI terminal, IDE sidebar chat, and Antigravity 2.0 Chat Canvas.
2. **Strict Read-Only & Access Isolation**: Scoped strictly to folders explicitly shared with the service account email. No access to unshared private drive files.
3. **Smart Format Conversion**: Automatically converts Google Docs into plain text/Markdown and Google Sheets into CSV format for immediate analysis.
4. **Pre-flight Environment Diagnostics**: Automatically verifies the presence of `gcloud` CLI, offering automated setup or web console guidance.
5. **Multi-Device & Multi-Account Support**: Repository is clean of secrets via `.gitignore`. Supports folders shared across multiple distinct Google accounts, seamlessly reusable across work and home machines.

## Plugin Management

• List installed plugins:

  ```bash
  agy plugin list
  ```

• Enable this plugin:

  ```bash
  agy plugin enable antigravity-google-drive
  ```

• Disable this plugin:

  ```bash
  agy plugin disable antigravity-google-drive
  ```

• Uninstall this plugin:

  ```bash
  agy plugin uninstall antigravity-google-drive
  ```

## Directory Structure

```text
antigravity-google-drive/
├── .gitignore
├── LICENSE
├── README.md
├── README.zh-TW.md
├── package.json
├── plugin.json
├── mcp_config.json
├── credentials.json
├── server/
│   └── index.mjs
├── skills/
│   └── agy-google-drive/
│       └── SKILL.md
└── rules/
    └── AGENTS.md
```

## Commands and Skills

Once installed, trigger capabilities using natural language prompts or dedicated slash commands:

### 1. Google Drive Assistant Skill

```text
/antigravity-google-drive:agy-google-drive
```

- **When to Use**: When you need the assistant to browse, search, or read files, Google Docs, or spreadsheets in shared Google Drive folders, or when initially configuring Drive permissions and service accounts.
- **How It Works**:
  1. **Pre-flight Check**: Checks for `credentials.json`; if absent, inspects `gcloud` CLI availability and guides automated installation or manual GCP console steps.
  2. **Model Context Protocol (MCP) Startup**: Spawns the lightweight local Node.js MCP server to expose drive tools over stdio.
  3. **Folder Browsing & Search**: Calls `gdrive_list_folder` or `gdrive_search` to discover items and web view links.
  4. **Content Reading & Export**: Calls `gdrive_read_file` to export Google Docs or text files to Markdown/plain text for chat comprehension.
- **Parameters / Examples**:
```text
/antigravity-google-drive:agy-google-drive Search for DevFest folders in Google Drive
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
