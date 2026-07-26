import { app, BrowserWindow, ipcMain } from 'electron'
import electronUpdater, { type ProgressInfo, type UpdateInfo } from 'electron-updater'
import { EventEmitter } from 'node:events'
import { BRAND } from '../../src/config/brand.ts'

// electron-updater is CommonJS. Use its default export so the packaged
// Electron ESM main process does not rely on Node's named-export heuristics.
const { autoUpdater } = electronUpdater

export type UpdateStatusName = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

export type UpdateStatus = {
  status: UpdateStatusName
  info?: UpdateInfo
  progress?: ProgressInfo
  error?: string
}

const DEFAULT_UPDATE_BASE_URL = 'https://huanxing.tos-cn-beijing.volces.com/package/Tapdance'

function updateFeedUrl(): string {
  const configured = String((BRAND as { updateFeedBaseUrl?: string }).updateFeedBaseUrl || '').trim()
  if (configured) return configured.replace(/\/+$/u, '')
  return `${DEFAULT_UPDATE_BASE_URL}/${BRAND.id === 'huanxing' ? '' : `${BRAND.id}/`}latest`
}

export class AppUpdater extends EventEmitter {
  private mainWindow: BrowserWindow | null = null
  private status: UpdateStatus = { status: 'idle' }

  constructor() {
    super()
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.logger = {
      info: (message: string) => console.info('[Updater]', message),
      warn: (message: string) => console.warn('[Updater]', message),
      error: (message: string) => console.error('[Updater]', message),
      debug: (message: string) => console.debug('[Updater]', message),
    }
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: updateFeedUrl(),
      useMultipleRangeRequest: false,
    })

    console.info(`[Updater] ${BRAND.id} feed: ${updateFeedUrl()}`)
    this.setupListeners()
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  getStatus(): UpdateStatus {
    return this.status
  }

  getCurrentVersion(): string {
    return app.getVersion()
  }

  private setupListeners(): void {
    autoUpdater.on('checking-for-update', () => this.updateStatus({ status: 'checking' }))
    autoUpdater.on('update-available', (info: UpdateInfo) => this.updateStatus({ status: 'available', info }))
    autoUpdater.on('update-not-available', (info: UpdateInfo) => this.updateStatus({ status: 'not-available', info }))
    autoUpdater.on('download-progress', (progress: ProgressInfo) => this.updateStatus({ status: 'downloading', progress }))
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => this.updateStatus({ status: 'downloaded', info }))
    autoUpdater.on('error', (error: Error) => this.updateStatus({ status: 'error', error: error.message || String(error) }))
  }

  private updateStatus(next: Partial<UpdateStatus>): void {
    this.status = {
      status: next.status || this.status.status,
      info: next.info,
      progress: next.progress,
      error: next.error,
    }
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update:status-changed', this.status)
    }
    this.emit('status-changed', this.status)
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (!app.isPackaged) {
      this.updateStatus({ status: 'error', error: '开发环境未打包，无法检查更新' })
      return null
    }

    try {
      const result = await autoUpdater.checkForUpdates()
      if (!result) {
        this.updateStatus({ status: 'not-available' })
        return null
      }
      if (this.status.status === 'checking' || this.status.status === 'idle') {
        this.updateStatus({ status: 'not-available', info: result.updateInfo })
      }
      return result.updateInfo
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.updateStatus({ status: 'error', error: message })
      throw error
    }
  }

  async downloadUpdate(): Promise<void> {
    await autoUpdater.downloadUpdate()
  }

  installUpdate(): void {
    autoUpdater.quitAndInstall()
  }
}

export function registerUpdateHandlers(updater: AppUpdater, mainWindow: BrowserWindow): void {
  updater.setMainWindow(mainWindow)

  ipcMain.handle('update:status', () => updater.getStatus())
  ipcMain.handle('update:version', () => updater.getCurrentVersion())
  ipcMain.handle('update:check', async () => {
    try {
      await updater.checkForUpdates()
      return { success: true, status: updater.getStatus() }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), status: updater.getStatus() }
    }
  })
  ipcMain.handle('update:download', async () => {
    try {
      await updater.downloadUpdate()
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
  ipcMain.handle('update:install', () => {
    updater.installUpdate()
    return { success: true }
  })
}

export function scheduleAutomaticUpdateCheck(updater: AppUpdater): void {
  if (!app.isPackaged) return
  setTimeout(() => {
    void updater.checkForUpdates().catch(() => undefined)
  }, 10000)
}
