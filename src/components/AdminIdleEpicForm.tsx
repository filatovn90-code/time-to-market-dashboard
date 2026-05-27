import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { Epic, Period, RolloutQuarter, Stream } from "../types";

interface AdminIdleEpicFormProps {
  period: Period;
  streams: Stream[];
  onAdd: (epic: Epic) => void;
}

const periodToQuarter = (period: Period): RolloutQuarter => (period === "Q1" || period === "Q3" || period === "Q4" ? period : "Q2");

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

export function AdminIdleEpicForm({ period, streams, onAdd }: AdminIdleEpicFormProps) {
  const [title, setTitle] = useState("");
  const [streamId, setStreamId] = useState(streams[0]?.id ?? "");
  const [daysInProgress, setDaysInProgress] = useState("0");
  const [daysWithoutActivity, setDaysWithoutActivity] = useState("14");
  const [taskCount, setTaskCount] = useState("0");

  const selectedStream = streams.find((stream) => stream.id === streamId) ?? streams[0];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!selectedStream || !trimmedTitle) return;

    const id = `manual-idle-${Date.now()}`;
    onAdd({
      id,
      key: "",
      title: trimmedTitle,
      streamId: selectedStream.id,
      manualStreamName: selectedStream.name,
      teamId: selectedStream.teams[0]?.id ?? "",
      status: "В работе",
      totalTtmDays: toNumber(daysInProgress),
      discoveryDays: 0,
      deliveryDays: 0,
      rolloutDays: 0,
      rolloutQuarter: periodToQuarter(period),
      rolloutCompletedAt: "",
      daysInProgress: toNumber(daysInProgress),
      daysWithoutActivity: toNumber(daysWithoutActivity),
      linkedTasks: [],
      manualLinkedTaskCount: toNumber(taskCount),
    });

    setTitle("");
    setDaysInProgress("0");
    setDaysWithoutActivity("14");
    setTaskCount("0");
  };

  return (
    <section className="card p-5 sm:p-6">
      <div>
        <p className="label">Администрирование</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">Добавить эпик с простоем</h2>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,1.4fr)_repeat(3,minmax(120px,1fr))_auto]">
          <label className="text-sm font-medium text-ink">
            Эпик
            <input
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Название эпика"
              required
            />
          </label>
          <label className="text-sm font-medium text-ink">
            В работе
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
              value={daysInProgress}
              onChange={(event) => setDaysInProgress(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Без активности
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
              value={daysWithoutActivity}
              onChange={(event) => setDaysWithoutActivity(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Задач
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
              value={taskCount}
              onChange={(event) => setTaskCount(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-ink">Стрим</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {streams.map((stream) => {
              const selected = stream.id === selectedStream?.id;

              return (
                <button
                  key={stream.id}
                  type="button"
                  onClick={() => setStreamId(stream.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-slate-300"
                  }`}
                >
                  {stream.name}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </section>
  );
}
