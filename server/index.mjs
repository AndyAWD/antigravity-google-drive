#!/usr/bin/env node

/**
 * Antigravity Google Drive MCP Server
 * Provides read-only access to Google Drive folders shared with a Service Account.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginDir = path.resolve(__dirname, '..');

/**
 * Resolve the service account credentials path
 */
function getCredentialsPath() {
  if (process.env.GDRIVE_CREDENTIALS_PATH && fs.existsSync(process.env.GDRIVE_CREDENTIALS_PATH)) {
    return process.env.GDRIVE_CREDENTIALS_PATH;
  }
  const localPluginKey = path.join(pluginDir, 'credentials.json');
  if (fs.existsSync(localPluginKey)) {
    return localPluginKey;
  }
  const homeFallbackKey = path.join(os.homedir(), '.gemini', 'gdrive-service-account.json');
  if (fs.existsSync(homeFallbackKey)) {
    return homeFallbackKey;
  }
  return null;
}

/**
 * Initialize Google Drive API client
 */
function getDriveClient() {
  const credPath = getCredentialsPath();
  if (!credPath) {
    throw new Error(
      `[antigravity-google-drive] 找不到服務帳戶金鑰。請確認已將 credentials.json 放入外掛程式目錄 (${path.join(pluginDir, 'credentials.json')}) 或設定 GDRIVE_CREDENTIALS_PATH 環境變數。`
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

// Create MCP Server instance
const server = new Server(
  {
    name: 'antigravity-google-drive',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Tool List
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'gdrive_list_folder',
        description:
          '列出 Google 雲端硬碟指定資料夾內的檔案與子資料夾清單。若不傳入 folderId，則預設列出所有已共用給服務帳戶的項目。',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: {
              type: 'string',
              description: '要瀏覽的 Google 雲端硬碟資料夾 ID。若未提供，則列出共用給該服務帳戶的根項目。',
            },
            pageSize: {
              type: 'number',
              description: '單次取得的檔案上限數量（預設 50，最大 100）。',
              default: 50,
            },
          },
        },
      },
      {
        name: 'gdrive_search',
        description:
          '在 Google 雲端硬碟共用檔案中依檔名關鍵字或 Google Drive 搜尋語法搜尋檔案。',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜尋關鍵字或查詢語法（例如：檔名關鍵字 "report" 或語法 "name contains \'report\' and mimeType = \'application/pdf\'"）。',
            },
            pageSize: {
              type: 'number',
              description: '返回的最大檔案數量（預設 20）。',
              default: 20,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'gdrive_read_file',
        description:
          '讀取 Google 雲端硬碟檔案內容。支援純文字、Markdown、程式碼檔案，並會自動將 Google 文件（Docs）匯出為純文字、試算表（Sheets）匯出為 CSV 格式。',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              description: '要讀取的 Google 雲端硬碟檔案 ID。',
            },
            maxChars: {
              type: 'number',
              description: '返回內容的字元上限（預設 50000 字元）。',
              default: 50000,
            },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'gdrive_get_file_info',
        description:
          '取得 Google 雲端硬碟特定檔案或資料夾的詳細後設資料（名稱、大小、類型、建立/修改時間、網頁檢視連結等）。',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              description: '檔案或資料夾 ID。',
            },
          },
          required: ['fileId'],
        },
      },
    ],
  };
});

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const drive = getDriveClient();

    if (name === 'gdrive_list_folder') {
      const folderId = args?.folderId;
      const pageSize = Math.min(Number(args?.pageSize) || 50, 100);

      let q = 'trashed = false';
      if (folderId) {
        q += ` and '${folderId}' in parents`;
      } else {
        q += ` and ('root' in parents or sharedWithMe = true)`;
      }

      const res = await drive.files.list({
        q,
        pageSize,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, parents)',
        orderBy: 'folder,name',
      });

      const files = res.data.files || [];
      const summary = files.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.mimeType === 'application/vnd.google-apps.folder' ? '資料夾 (Folder)' : f.mimeType,
        sizeBytes: f.size || 'N/A',
        modifiedTime: f.modifiedTime,
        link: f.webViewLink,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                currentFolderId: folderId || 'shared-root',
                itemCount: files.length,
                nextPageToken: res.data.nextPageToken || null,
                items: summary,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'gdrive_search') {
      const rawQuery = String(args?.query || '').trim();
      const pageSize = Math.min(Number(args?.pageSize) || 20, 100);

      let q = 'trashed = false';
      if (rawQuery.includes('=') || rawQuery.includes('contains') || rawQuery.includes('in parents')) {
        q += ` and (${rawQuery})`;
      } else {
        const escaped = rawQuery.replace(/['\\]/g, '');
        q += ` and (name contains '${escaped}' or fullText contains '${escaped}')`;
      }

      const res = await drive.files.list({
        q,
        pageSize,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
      });

      const files = res.data.files || [];
      const summary = files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        sizeBytes: f.size || 'N/A',
        modifiedTime: f.modifiedTime,
        link: f.webViewLink,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                query: rawQuery,
                matchCount: files.length,
                files: summary,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'gdrive_read_file') {
      const fileId = String(args?.fileId || '').trim();
      const maxChars = Number(args?.maxChars) || 50000;

      // First retrieve file metadata
      const meta = await drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields: 'id, name, mimeType, size, modifiedTime',
      });

      const { name: fileName, mimeType } = meta.data;
      let textContent = '';

      if (mimeType === 'application/vnd.google-apps.document') {
        const exported = await drive.files.export(
          { fileId, mimeType: 'text/plain' },
          { responseType: 'text' }
        );
        textContent = typeof exported.data === 'string' ? exported.data : JSON.stringify(exported.data);
      } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        const exported = await drive.files.export(
          { fileId, mimeType: 'text/csv' },
          { responseType: 'text' }
        );
        textContent = typeof exported.data === 'string' ? exported.data : JSON.stringify(exported.data);
      } else if (mimeType === 'application/vnd.google-apps.presentation') {
        const exported = await drive.files.export(
          { fileId, mimeType: 'text/plain' },
          { responseType: 'text' }
        );
        textContent = typeof exported.data === 'string' ? exported.data : JSON.stringify(exported.data);
      } else {
        // Download raw media for standard text/code/json/csv files
        const downloaded = await drive.files.get(
          { fileId, alt: 'media', supportsAllDrives: true },
          { responseType: 'text' }
        );
        textContent = typeof downloaded.data === 'string' ? downloaded.data : JSON.stringify(downloaded.data);
      }

      const isTruncated = textContent.length > maxChars;
      const displayContent = isTruncated
        ? textContent.slice(0, maxChars) + `\n\n... [內容已截斷，已顯示前 ${maxChars} 字元，共 ${textContent.length} 字元]`
        : textContent;

      return {
        content: [
          {
            type: 'text',
            text: `[Google Drive 檔案: ${fileName} (${mimeType})]\n\n${displayContent}`,
          },
        ],
      };
    }

    if (name === 'gdrive_get_file_info') {
      const fileId = String(args?.fileId || '').trim();
      const meta = await drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields:
          'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, description, owners, permissions',
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(meta.data, null, 2),
          },
        ],
      };
    }

    throw new Error(`未知的工具名稱: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `[Google Drive 操作失敗] ${error.message || error}`,
        },
      ],
    };
  }
});

// Run server over stdio
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch((err) => {
  process.stderr.write(`MCP Server Error: ${err}\n`);
  process.exit(1);
});
