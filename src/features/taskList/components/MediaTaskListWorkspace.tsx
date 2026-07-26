import { useMemo, useState } from 'react';
import { Check, CheckCircle2, Clock3, Copy, Film, Image as ImageIcon, ListFilter, Maximize2, Play, X, XCircle } from 'lucide-react';

import type { Project } from '../../../types.ts';
import type { ImageCreationRecord } from '../../imageCreation/types.ts';
import { StudioPage, StudioPageHeader, StudioPanel, cx } from '../../../components/studio/StudioPrimitives.tsx';

type MediaTaskListWorkspaceProps = {
  projects: Project[];
  imageCreationRecords: ImageCreationRecord[];
};

type MediaTask = {
  id: string;
  kind: 'image' | 'video';
  title: string;
  prompt: string;
  projectName: string;
  groupName: string;
  createdAt: string;
  status: 'completed' | 'generating' | 'failed' | 'idle';
  url?: string;
  outputCount?: number;
  sourceLabel: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '时间未知';
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: MediaTask['status']) {
  if (status === 'completed') return '已完成';
  if (status === 'failed') return '失败';
  if (status === 'generating') return '生成中';
  return '待处理';
}

function statusClass(status: MediaTask['status']) {
  if (status === 'completed') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
  if (status === 'failed') return 'border-rose-400/20 bg-rose-400/10 text-rose-200';
  if (status === 'generating') return 'border-amber-400/20 bg-amber-400/10 text-amber-200';
  return 'border-white/10 bg-white/5 text-[var(--studio-muted)]';
}

function buildMediaTasks(projects: Project[], imageCreationRecords: ImageCreationRecord[]): MediaTask[] {
  const tasks: MediaTask[] = [];

  imageCreationRecords.forEach((record) => {
    tasks.push({
      id: `image-generation-${record.id}`,
      kind: 'image',
      title: record.title || '图片生成任务',
      prompt: record.prompt,
      projectName: record.groupName || '图片生成',
      groupName: record.groupName,
      createdAt: record.createdAt,
      status: record.outputs.length > 0 ? 'completed' : 'failed',
      url: record.outputs[0]?.url,
      outputCount: record.outputs.length,
      sourceLabel: '图片生成',
    });
  });

  for (const project of projects) {
    const projectName = project.name || '未命名项目';
    const groupName = project.groupName || '';

    project.shots.forEach((shot) => {
      const baseTitle = `镜头 ${shot.shotNumber}`;
      const prompt = shot.videoPrompt?.textToVideoZh || shot.videoPrompt?.textToVideo || shot.subject || shot.action || baseTitle;
      if (shot.imageUrl) {
        tasks.push({
          id: `${project.id}-shot-${shot.id}-image`,
          kind: 'image',
          title: `${baseTitle} 首帧`,
          prompt: shot.imagePrompt?.professionalZh || shot.imagePrompt?.professional || prompt,
          projectName,
          groupName,
          createdAt: project.createdAt,
          status: 'completed',
          url: shot.imageUrl,
          sourceLabel: '分镜图片',
        });
      }
      if (shot.lastFrameImageUrl) {
        tasks.push({
          id: `${project.id}-shot-${shot.id}-last-frame`,
          kind: 'image',
          title: `${baseTitle} 尾帧`,
          prompt,
          projectName,
          groupName,
          createdAt: project.createdAt,
          status: 'completed',
          url: shot.lastFrameImageUrl,
          sourceLabel: '分镜图片',
        });
      }
      if (shot.videoUrl || shot.videoStatus === 'generating' || shot.videoStatus === 'failed') {
        tasks.push({
          id: `${project.id}-shot-${shot.id}-video`,
          kind: 'video',
          title: `${baseTitle} 视频`,
          prompt,
          projectName,
          groupName,
          createdAt: project.createdAt,
          status: shot.videoStatus === 'failed' ? 'failed' : shot.videoStatus === 'generating' ? 'generating' : 'completed',
          url: shot.videoUrl,
          sourceLabel: '镜头视频',
        });
      }
      if (shot.transitionVideoUrl || shot.transitionVideoStatus === 'generating' || shot.transitionVideoStatus === 'failed') {
        tasks.push({
          id: `${project.id}-shot-${shot.id}-transition`,
          kind: 'video',
          title: `${baseTitle} 转场视频`,
          prompt: shot.transitionVideoPromptZh || shot.transitionVideoPrompt || prompt,
          projectName,
          groupName,
          createdAt: project.createdAt,
          status: shot.transitionVideoStatus === 'failed' ? 'failed' : shot.transitionVideoStatus === 'generating' ? 'generating' : 'completed',
          url: shot.transitionVideoUrl,
          sourceLabel: '转场视频',
        });
      }
    });

    const fastTask = project.fastFlow.task;
    if (fastTask.videoUrl || fastTask.status !== 'idle') {
      tasks.push({
        id: `${project.id}-fast-video`,
        kind: 'video',
        title: '极速视频',
        prompt: project.fastFlow.videoPrompt?.promptZh || project.fastFlow.videoPrompt?.prompt || project.fastFlow.input.prompt || '极速视频任务',
        projectName,
        groupName,
        createdAt: fastTask.startedAt || project.createdAt,
        status: fastTask.status === 'failed' || fastTask.status === 'cancelled' ? 'failed' : fastTask.status === 'completed' ? 'completed' : fastTask.status === 'idle' ? 'idle' : 'generating',
        url: fastTask.videoUrl,
        sourceLabel: '极速视频',
      });
    }

    project.fastFlow.scenes.forEach((scene, index) => {
      if (!scene.imageUrl) return;
      tasks.push({
        id: `${project.id}-fast-scene-${scene.id}`,
        kind: 'image',
        title: scene.title || `极速分镜 ${index + 1}`,
        prompt: scene.imagePromptZh || scene.imagePrompt || scene.summary || scene.title,
        projectName,
        groupName,
        createdAt: project.createdAt,
        status: scene.status === 'failed' ? 'failed' : scene.status === 'generating' ? 'generating' : 'completed',
        url: scene.imageUrl,
        sourceLabel: '极速分镜图片',
      });
    });
  }

  return tasks.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function MediaTaskListWorkspace({ projects, imageCreationRecords }: MediaTaskListWorkspaceProps) {
  const tasks = useMemo(() => buildMediaTasks(projects, imageCreationRecords), [projects, imageCreationRecords]);
  const [previewTask, setPreviewTask] = useState<MediaTask | null>(null);
  const [copiedTaskId, setCopiedTaskId] = useState('');
  const imageCount = tasks.filter((task) => task.kind === 'image').length;
  const videoCount = tasks.filter((task) => task.kind === 'video').length;

  const handleCopyUrl = async (task: MediaTask) => {
    if (!task.url) return;
    try {
      await navigator.clipboard.writeText(task.url);
    } catch {
      const input = document.createElement('textarea');
      input.value = task.url;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopiedTaskId(task.id);
    window.setTimeout(() => setCopiedTaskId((current) => current === task.id ? '' : current), 1600);
  };

  return (
    <StudioPage className="studio-page-wide">
      <StudioPageHeader
        eyebrow="Task History"
        title="任务列表"
        description="集中查看历史生成的图片、分镜和视频任务。"
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <span className="studio-chip"><ImageIcon className="h-3.5 w-3.5" />{imageCount} 张图片</span>
            <span className="studio-chip"><Film className="h-3.5 w-3.5" />{videoCount} 个视频</span>
          </div>
        )}
      />

      <StudioPanel className="mt-6 p-5" tone="soft">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--studio-border)] px-6 py-16 text-center text-[var(--studio-muted)]">
            <ListFilter className="h-8 w-8" />
            <p className="mt-3 text-sm">暂时没有历史图片或视频任务</p>
            <p className="mt-1 text-xs text-[var(--studio-dim)]">生成内容后，任务会自动出现在这里。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <article key={task.id} className="overflow-hidden rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-field)]">
                <div className="relative aspect-video overflow-hidden bg-black/20">
                  {task.url && task.kind === 'video' ? <video src={task.url} controls preload="metadata" className="h-full w-full object-contain" /> : task.url ? <img src={task.url} alt={task.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[var(--studio-dim)]">{task.kind === 'video' ? <Film className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}</div>}
                  {task.url ? (
                    <button type="button" onClick={() => setPreviewTask(task)} className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85" title="放大查看">
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  ) : null}
                  {task.kind === 'video' && task.url ? <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[10px] text-white"><Play className="h-3 w-3" />视频</span> : null}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[var(--studio-text)]">{task.title}</h3>
                      <p className="mt-1 truncate text-[11px] text-[var(--studio-muted)]">{task.projectName}{task.groupName ? ` / ${task.groupName}` : ''}</p>
                    </div>
                    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px]', statusClass(task.status))}>
                      {task.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : task.status === 'failed' ? <XCircle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                      {statusLabel(task.status)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-5 text-[var(--studio-muted)]">{task.prompt}</p>
                  <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--studio-dim)]">
                    <span>{task.sourceLabel}</span>
                    <span>{formatDate(task.createdAt)}</span>
                  </div>
                  {task.url ? (
                    <button type="button" onClick={() => void handleCopyUrl(task)} className="studio-button studio-button-secondary w-full justify-center px-3 py-2 text-xs">
                      {copiedTaskId === task.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedTaskId === task.id ? '已复制 URL' : '复制 URL'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </StudioPanel>
      {previewTask?.url ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setPreviewTask(null)}>
          <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
              <div className="min-w-0"><h2 className="truncate text-sm font-semibold">{previewTask.title}</h2><p className="truncate text-xs text-zinc-400">{previewTask.sourceLabel}</p></div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void handleCopyUrl(previewTask)} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10"><Copy className="h-3.5 w-3.5" />复制 URL</button>
                <button type="button" onClick={() => setPreviewTask(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10" title="关闭"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-4">
              {previewTask.kind === 'video' ? <video src={previewTask.url} controls autoPlay className="max-h-[78vh] max-w-full" /> : <img src={previewTask.url} alt={previewTask.title} className="max-h-[78vh] max-w-full object-contain" />}
            </div>
          </div>
        </div>
      ) : null}
    </StudioPage>
  );
}
