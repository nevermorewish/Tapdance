# Tapdance

AI 导演工作台。把一句创意想法逐步整理成 Brief、角色 / 场景资产、分镜、首尾帧提示词、视频提示词和可轮询的视频生成任务。

当前项目以 `Electron + React + Vite + TypeScript` 桌面应用为主，所有模型和素材服务统一连接 `NewAPI`（默认地址为 Huanxing API 部署）。

## 功能

- 创意输入后生成结构化 `Brief`
- 生成并维护角色、场景、商品等一致性资产
- 生成分镜列表、首帧 / 尾帧提示词、图像提示词、视频提示词
- 支持单镜头视频、转场视频、极速成片工作流
- 支持 NewAPI 用户登录与注册，登录后自动获取账号令牌
- 默认文本模型 `gpt-5.6-sol`、生图模型 `gpt-image-2`、视频模型 `seedance`
- 图片使用 Huanxing Images API（`/v1/images/generations`、`/v1/images/edits`），视频使用 Seedance v3，素材库统一使用 Huanxing API 的 `/api/material`（不直接调用火山 Ark 素材接口）
- 本地保存项目、连接配置、调用日志和界面偏好；素材同步到当前 NewAPI 账号

## 用户使用

推荐直接使用桌面版。桌面版会自动启动内置 bridge，并把项目、配置、调用日志和素材数据持久化到本地应用目录；相比之下，Web 版更适合界面调试。

### 1. 环境准备

- Node.js 22+ 推荐
- npm
- 准备一个已启用注册/登录和令牌功能的 NewAPI 地址

### 2. 安装依赖

```bash
npm install
```

### 3. 启动桌面版

```bash
npm run dev:electron
```

启动后会：

- 打开 Electron 桌面应用
- 自动启动内置 Seedance bridge
- 自动接入本地持久化存储

### 4. 首次进入应用建议先做这几件事

1. 在启动页填写 NewAPI 地址并登录，或切换到注册页创建账号
2. 在“API 配置”中按需调整三类模型名
3. 生成图片、视频或保存素材时，额度和权限均来自当前 NewAPI 账号

### 5. 推荐使用路径

1. 新建项目，输入一句创意想法
2. 生成结构化 `Brief`
3. 补充角色、场景、商品等一致性资产
4. 继续生成分镜、首尾帧提示词、视频提示词
5. 在“视频”或“极速成片”中提交任务并轮询结果

### 6. 基础检查

```bash
npm test
npm run lint
npm run build:electron
```

## 常用命令

```bash
npm run dev:electron # 推荐：启动桌面版开发环境
npm run build:electron
npm run pack:mac
npm run pack:win
npm run dev:web      # 仅用于前端页面调试
npm run dev:bridge   # 仅用于单独调试本地 bridge
npm run dev          # 同时启动 Vite 和独立 bridge（偏 Web 调试场景）
npm test
npm run lint
npm run build
npm run preview
```

## 人像库

仓库保留了清理后的 `public/portrait_lib_raw.json` 索引，但不内置完整人像图片包。

如需在“人像库”页面显示本地预览图，请按 [虚拟人像库集成指南](docs/PORTRAIT_LIBRARY.md) 准备 `public/portraits/`。

## 配置说明

### NewAPI

登录后应用自动读取当前账号的 API 令牌，不需要再复制 Key。连接地址可以填写 Huanxing API 的自部署地址；模型请求使用 OpenAI 兼容文本接口、Huanxing Images API 和 Seedance v3 视频接口。

### 素材库

“资产库”中的生成结果会创建或复用当前项目分组，并通过 `POST /api/material?Action=CreateAsset` 写入 Huanxing 素材库。素材权限按 Huanxing 令牌隔离。

如需调试 Web 版，默认把 `/api/seedance` 代理到 `http://127.0.0.1:3210`，这时再单独启动 `npm run dev:bridge` 即可。

## 文档

- [维护者架构文档](docs/CORE.md)
- [发布流程](docs/RELEASE.md)
- [虚拟人像库集成](docs/PORTRAIT_LIBRARY.md)
- [Seedance 极速成片设计](docs/seedance-fast-video-design.md)
- [视频参考素材设计](docs/video-reference-design.md)
- [HappyHorse API 接入文档](docs/happyhorse/api-docs.md)

## 交流

如有问题可以进群讨论：

![Tapdance 交流群二维码](public/QRCode.JPG)
