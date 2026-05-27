import type { Direction, Stream } from "../types";

type MetricPatch = Partial<Pick<Direction, "ttm" | "discovery" | "delivery" | "rollout" | "previousTtm">>;

interface AdminMetricsPanelProps {
  direction: Direction;
  streams: Stream[];
  onDirectionChange: (patch: MetricPatch) => void;
  onStreamChange: (streamId: string, patch: MetricPatch) => void;
}

const metricFields = [
  { key: "ttm", label: "TTM" },
  { key: "discovery", label: "Discovery" },
  { key: "delivery", label: "Delivery" },
  { key: "rollout", label: "Rollout" },
  { key: "previousTtm", label: "Прошлый отчет" },
] as const;

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

export function AdminMetricsPanel({ direction, streams, onDirectionChange, onStreamChange }: AdminMetricsPanelProps) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="label">Администрирование</p>
        <h2 className="text-xl font-semibold text-ink">Ручное изменение метрик</h2>
      </div>

      <div className="mt-5 space-y-5">
        <div className="rounded-lg border border-line bg-surface/60 p-4">
          <h3 className="text-sm font-semibold text-ink">Дирекция</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {metricFields.map((field) => (
              <label key={field.key} className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                {field.label}
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base font-semibold text-ink"
                  value={direction[field.key]}
                  onChange={(event) => onDirectionChange({ [field.key]: toNumber(event.target.value) })}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {streams.map((stream) => (
            <div key={stream.id} className="rounded-lg border border-line p-4">
              <h3 className="text-sm font-semibold text-ink">{stream.name}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {metricFields.map((field) => (
                  <label key={field.key} className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                    {field.label}
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-base font-semibold text-ink"
                      value={stream[field.key]}
                      onChange={(event) => onStreamChange(stream.id, { [field.key]: toNumber(event.target.value) })}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
