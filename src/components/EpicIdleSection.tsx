import { Filter } from "lucide-react";
import type { Epic, Stream, Task } from "../types";
import { getEpicIdleStats } from "../utils/calculations";
import { MetricCard } from "./MetricCard";

interface EpicIdleSectionProps {
  epics: Epic[];
  streams: Stream[];
  tasks: Task[];
  selectedStreamId: string;
  onStreamChange: (streamId: string) => void;
}

export function EpicIdleSection({ epics, streams, tasks, selectedStreamId, onStreamChange }: EpicIdleSectionProps) {
  const streamById = new Map(streams.map((stream) => [stream.id, stream.name]));
  const teamById = new Map(streams.flatMap((stream) => stream.teams.map((team) => [team.id, team.name])));
  const selectedStreamName = streamById.get(selectedStreamId);
  const filteredEpics =
    selectedStreamId === "all"
      ? epics
      : epics.filter((epic) => epic.streamId === selectedStreamId || epic.manualStreamName === selectedStreamName);
  const filteredEpicIds = new Set(filteredEpics.map((epic) => epic.id));
  const filteredTasks = selectedStreamId === "all" ? tasks : tasks.filter((task) => filteredEpicIds.has(task.epicId));
  const stats = getEpicIdleStats(filteredEpics);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="label">Простои эпиков</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Простои эпиков в статусе 'В работе'</h2>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <Filter size={16} />
            Стрим
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onStreamChange("all")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                selectedStreamId === "all" ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-slate-300"
              }`}
            >
              Все стримы
            </button>
            {streams.map((stream) => (
              <button
                key={stream.id}
                type="button"
                onClick={() => onStreamChange(stream.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  selectedStreamId === stream.id ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-slate-300"
                }`}
              >
                {stream.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <MetricCard label="Эпиков с простоем" value={stats.count} helper="Без активности более 10 дней" tone="yellow" />
        <MetricCard label="Средний простой" value={`${stats.averageIdleDays} дн.`} helper="По выбранному стриму" />
        <MetricCard label="Максимальный простой" value={`${stats.maxIdleDays} дн.`} helper={stats.top[0]?.title ?? "Нет простоев"} tone="red" />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.08em] text-muted">
              <th className="border-b border-line py-3 pr-4">Стрим</th>
              <th className="border-b border-line px-4">Команда</th>
              <th className="border-b border-line px-4">Эпик</th>
              <th className="border-b border-line px-4 text-right">В работе</th>
              <th className="border-b border-line px-4 text-right">Без активности</th>
              <th className="border-b border-line px-4 text-right">Задач</th>
            </tr>
          </thead>
          <tbody>
            {stats.idleEpics.map((epic) => {
              const linkedTasks = epic.manualLinkedTaskCount ?? filteredTasks.filter((task) => epic.linkedTasks.includes(task.id)).length;
              const streamName = epic.manualStreamName ?? streamById.get(epic.streamId) ?? "Не указан";
              const teamName = teamById.get(epic.teamId) ?? "Не указана";

              return (
                <tr key={epic.id} className="border-b border-line">
                  <td className="border-b border-line py-3 pr-4 text-ink">{streamName}</td>
                  <td className="border-b border-line px-4 text-muted">{teamName}</td>
                  <td className="border-b border-line px-4">
                    {epic.key ? <p className="font-semibold text-ink">{epic.key}</p> : null}
                    <p className="text-muted">{epic.title}</p>
                  </td>
                  <td className="border-b border-line px-4 text-right font-medium">{epic.daysInProgress}</td>
                  <td className="border-b border-line px-4 text-right font-semibold text-red-700">{epic.daysWithoutActivity}</td>
                  <td className="border-b border-line px-4 text-right">{linkedTasks}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
