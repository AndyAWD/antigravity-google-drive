---
name: agy-google-drive
description: 連線至 Google 雲端硬碟（Google Drive）讀取、搜尋與下載資料夾中的檔案，支援將 Google 文件與試算表匯出為純文字/Markdown。具備自動環境檢查（gcloud CLI 偵測、自動安裝或引導專案建立與共用）。當使用者輸入 /antigravity-google-drive:agy-google-drive 或提及「Google Drive」、「Google 雲端硬碟」、「讀取雲端硬碟檔案」時觸發。
---

# Google 雲端硬碟助理技能（Google Drive Integration Skill）

本技能規範 Antigravity 助理如何存取 Google 雲端硬碟共用資料夾，並在執行任務前執行環境檢查與身分驗證。

---

## 階段 0：金鑰與環境檢查流程

每次觸發本技能或進行 Google 雲端硬碟操作前，必須嚴格依序執行以下環境檢查：

### 步驟 0.1：檢查本機金鑰檔案
檢查外掛程式目錄下是否存在服務帳戶（Service Account）金鑰：
```bash
ls ~/.gemini/config/plugins/antigravity-google-drive/credentials.json
```
- **若金鑰已存在且可讀取**：直接跳至「[階段 2：雲端硬碟操作流程](#階段-2雲端硬碟操作流程)」。
- **若金鑰不存在**：進入「步驟 0.2：gcloud 工具檢查」。

---

### 步驟 0.2：檢查 gcloud 命令列介面
執行指令確認系統是否已安裝 Google Cloud 命令列介面（Command Line Interface, CLI）：
```bash
which gcloud || gcloud --version
```

根據檢查結果進行分支處理：

#### 狀況 A：系統未安裝 gcloud
必須呼叫 `ask_question` 工具詢問使用者是否要自動安裝 `gcloud`：
* **問題**：`偵測到您的系統尚未安裝 Google Cloud CLI (gcloud)，請問您希望自動安裝還是進行手動網頁設定？`
* **選項 1 (Recommended)**：`(Recommended) 請自動幫我安裝 gcloud CLI（透過 Homebrew 或官方安裝腳本）`
* **選項 2**：`我不要安裝 gcloud，請提供 Google Cloud 網頁控制台手動設定步驟`

##### 分支 A-1：使用者選擇自動安裝 gcloud
1. 依據作業系統執行安裝：
   * macOS：
     ```bash
     brew install --cask google-cloud-sdk
     ```
   * Linux / 其他：
     ```bash
     curl https://sdk.cloud.google.com | bash
     ```
2. 安裝完成後，引導使用者於終端機執行驗證：
   ```bash
   gcloud auth login
   ```
3. 驗證成功後，進入「狀況 B：系統已安裝 gcloud」。

##### 分支 A-2：使用者選擇不要安裝 gcloud
直接向使用者列出以下 5 大手動設定步驟，引導其透過瀏覽器完成設定：
1. **建立專案**：登入 [Google Cloud Console](https://console.cloud.google.com/)，點選頂部建立新專案。
2. **啟用應用程式介面**：進入「API 和服務」>「已啟用的 API 和服務」>「+ 啟用 API 和服務」，搜尋並啟用 `Google Drive API`。
3. **建立服務帳戶**：進入「IAM 與管理」>「服務帳戶」，建立服務帳戶（例如命名為 `agy-drive-reader`），取得專屬電子郵件地址（例如 `agy-drive-reader@<project-id>.iam.gserviceaccount.com`）。
4. **下載金鑰檔案**：點入該服務帳戶 >「金鑰」分頁 >「新增金鑰」>「建立新的金鑰」選擇 JSON 格式下載。將下載的檔案重新命名為 `credentials.json` 並放置於外掛程式根目錄：`~/.gemini/config/plugins/antigravity-google-drive/credentials.json`。
5. **共用資料夾**：開啟個人 Google 雲端硬碟，在要讓助理讀取的資料夾按右鍵點選「共用」，將步驟 3 的服務帳戶電子郵件加入為「檢視者」。

---

#### 狀況 B：系統已安裝 gcloud
執行 `gcloud projects list` 查詢使用者現有的專案列表，並呼叫 `ask_question` 工具詢問專案名稱：
* **問題**：`請選擇或輸入您希望用於 Google 雲端硬碟整合的 Google Cloud 專案：`
* **選項**：
  * 列出查詢到的現有專案名稱作為選項（例如：`(Recommended) 使用現有專案：agy-gcp-control`）。
  * 提供「建立新的 Google Cloud 專案」選項。

使用者確認專案名稱（以 `<PROJECT_ID>` 代表）後，由助理依序自動執行以下建置命令：

1. **啟用 Google 雲端硬碟應用程式介面**：
   ```bash
   gcloud services enable drive.googleapis.com --project=<PROJECT_ID>
   ```

2. **建立專屬服務帳戶**：
   ```bash
   gcloud iam service-accounts create agy-drive-reader \
     --display-name="Antigravity Google Drive Reader" \
     --project=<PROJECT_ID>
   ```

3. **下載服務帳戶 JSON 金鑰至外掛程式目錄**：
   ```bash
   gcloud iam service-accounts keys create ~/.gemini/config/plugins/antigravity-google-drive/credentials.json \
     --iam-account=agy-drive-reader@<PROJECT_ID>.iam.gserviceaccount.com \
     --project=<PROJECT_ID>
   ```

4. **輸出專屬 ID 並提示使用者共用資料夾**：
   明確提示使用者：
   > 服務帳戶已就緒！您的專屬共用 ID 為：
   > `agy-drive-reader@<PROJECT_ID>.iam.gserviceaccount.com`
   > 請至個人 Google 雲端硬碟，將欲讓助理讀取的資料夾按右鍵「共用」，將此電子郵件加入為「檢視者」。

---

## 階段 2：雲端硬碟操作流程

當金鑰設定就緒後，助理可使用下列模型情境擴充協定（Model Context Protocol）工具進行檔案操作：

### 1. 瀏覽資料夾內容 (`gdrive_list_folder`)
* **用途**：列出共用資料夾內的檔案與子目錄清單。
* **參數**：
  * `folderId`（字串，可選）：若指定特定資料夾 ID，則列出該資料夾內的內容；若留空，則列出所有已共用給服務帳戶的項目。
  * `pageSize`（數值，可選）：單次傳回數量上限（預設 50）。

### 2. 關鍵字搜尋檔案 (`gdrive_search`)
* **用途**：在共用範圍內搜尋檔案名稱或全文內容。
* **參數**：
  * `query`（字串，必填）：關鍵字（例如：`會議記錄`、`規格書`）或 Google Drive 查詢語法。

### 3. 讀取與匯出檔案內容 (`gdrive_read_file`)
* **用途**：讀取指定檔案內容。
* **說明**：
  * 一般文字檔、Markdown、JSON、CSV：直接讀取文字內容。
  * Google 原生文件（Docs）：自動匯出為純文字檢視。
  * Google 試算表（Sheets）：自動匯出為 CSV 表格文字檢視。
* **參數**：
  * `fileId`（字串，必填）：檔案 ID。
  * `maxChars`（數值，可選）：最大讀取字元數（預設 50,000）。

### 4. 取得檔案後設資料 (`gdrive_get_file_info`)
* **用途**：查詢檔案或資料夾之建立時間、修改時間、大小、擁有者與網頁檢視連結。
