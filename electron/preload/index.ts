import type { TosConfig } from '../../src/types.ts'
import type { MockApiScenario } from '../../src/types.ts'
import type { UpdateStatus } from '../main/updater.ts'
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  isElectron: true,
  platform: process.platform,
  getBridgeUrl: () => ipcRenderer.invoke('bridge:getUrl'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:status'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatusChanged: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status)
    ipcRenderer.on('update:status-changed', listener)
    return () => ipcRenderer.removeListener('update:status-changed', listener)
  },
  getMockApiStatus: () => ipcRenderer.invoke('mock-api:status'),
  startMockApiServer: (options?: { port?: number; scenario?: MockApiScenario }) => ipcRenderer.invoke('mock-api:start', options),
  stopMockApiServer: () => ipcRenderer.invoke('mock-api:stop'),
  setMockApiScenario: (scenario: MockApiScenario) => ipcRenderer.invoke('mock-api:setScenario', scenario),
  setWindowAppearance: (themeMode: 'light' | 'dark') => ipcRenderer.invoke('window:setAppearance', themeMode),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  openRealPortraitValidation: (options: { h5Link: string; callbackURL: string }) => ipcRenderer.invoke('real-portrait:openValidation', options),
  uploadVideoToTos: (payload: {
    config?: TosConfig
    fileName: string
    fileType?: string
    defaultPrefix?: string
    data: ArrayBuffer
  }) => ipcRenderer.invoke('tos:uploadVideo', payload),
  selectDirectory: (options?: { title?: string; defaultPath?: string }) => ipcRenderer.invoke('dialog:selectDirectory', options),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in window)
  window.electron = electronAPI
  // @ts-ignore (define in window)
  window.electronAPI = api
}
