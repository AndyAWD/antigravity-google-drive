# antigravity-google-drive

[English](README.md) | 繁體中文

Google 雲端硬碟（Google Drive）整合外掛程式，提供與 Google 雲端硬碟的唯讀整合能力。透過 Google Cloud 服務帳戶（Service Account），助理僅能存取被明確共用的特定資料夾與檔案，完全隔離個人未授權資料。內建智慧檔案轉換（Google 文件自動轉為純文字/Markdown、Google 試算表轉為 CSV 表格）、全文檢索搜尋、以及自動化環境診斷與設定引導。

全面支援 Google Antigravity（AGY）的三大核心平台：Antigravity 命令列介面（Command-Line Interface / CLI）（`agy`）、Antigravity 整合開發環境（Integrated Development Environment / IDE）以及 Antigravity 2.0 桌面應用程式。

## 如何安裝

透過 Antigravity 命令列介面（CLI）進行全域安裝：

```bash
agy plugin install https://github.com/AndyAWD/antigravity-google-drive
```

或於本地開發時建立符號連結：

```bash
mkdir -p ~/.gemini/config/plugins
ln -sfn /Users/a00911914/Project/antigravity-google-drive ~/.gemini/config/plugins/antigravity-google-drive
```

## 特色亮點

1. **全平台無縫相容**：完美相容於 CLI 終端機、IDE 側邊欄對話框以及 2.0 桌面版的對話畫布（Chat Canvas）。
2. **嚴格唯讀與安全隔離**：基於服務帳戶專屬電子郵件進行共用授權，助理僅能存取被明確授權的資料夾，無法讀取個人硬碟其他未共用檔案。
3. **智慧格式轉換**：讀取 Google 原生文件時自動將 Google 文件（Docs）轉換為純文字/Markdown、試算表（Sheets）轉換為 CSV 表格，方便直接摘要與分析。
4. **自動環境檢查與建置引導**：執行前自動偵測系統是否安裝 `gcloud` 命令列工具，引導自動安裝或提供 5 大步驟手動控制台設定指引。
5. **跨裝置與多帳號通用**：金鑰檔案與原始碼嚴格隔離（`.gitignore` 排除），支援多個不同 Google 帳號同時共用資料夾，且能無縫於公司與家中電腦同步使用。

## 如何管理與切換外掛程式

• 列出已安裝外掛：

  ```bash
  agy plugin list
  ```

• 啟用外掛：

  ```bash
  agy plugin enable antigravity-google-drive
  ```

• 停用外掛：

  ```bash
  agy plugin disable antigravity-google-drive
  ```

• 移除外掛：

  ```bash
  agy plugin uninstall antigravity-google-drive
  ```

## 專案資料夾目錄

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

## 指令功能說明

安裝完成後，可在任何 AGY 介面透過語意對話或輸入對應的斜線指令（Slash Command）觸發：

### 1. Google 雲端硬碟助理技能

```text
/antigravity-google-drive:agy-google-drive
```

- **使用情境**：需要讓助理瀏覽、搜尋或讀取 Google 雲端硬碟共用資料夾中的檔案、Google 文件或試算表，或初次設定雲端存取權限與服務帳戶時。
- **運作流程**：
  1. **金鑰與環境檢查**：自動檢查本機是否存在 `credentials.json`；若無，檢查是否安裝 `gcloud` CLI 並以互動問答引導自動安裝或提供手動建立步驟。
  2. **模型情境擴充協定（MCP）載入**：啟動本地輕量 Node.js MCP 伺服器，載入共用資料夾讀取工具。
  3. **資料夾瀏覽與搜尋**：依據使用者需求呼叫 `gdrive_list_folder` 或 `gdrive_search` 獲取檔案清單與網頁連結。
  4. **內容讀取與匯出**：呼叫 `gdrive_read_file` 自動將目標 Google 文件或文字檔匯出為 Markdown/純文字以供對話分析。
- **操作範例**：
```text
/antigravity-google-drive:agy-google-drive 請幫我搜尋 DevFest 相關的資料夾
```

## 授權條款

本專案採用 MIT 授權條款釋出，詳情請參閱 [LICENSE](LICENSE) 檔案。
