import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BusinessStandardItem, Stream } from "../types";

interface RolloutTabProps {
  items: BusinessStandardItem[];
  streams: Stream[];
  isAdmin: boolean;
}

type BusinessStandardRow = BusinessStandardItem & {
  teamId?: string;
  teamName?: string;
};

type InfluenceMetric = {
  id: string;
  plannedImpact: string;
  actualImpact: string;
};

type InfluenceDraft = Record<string, { metrics: InfluenceMetric[] }>;

const influenceStorageKey = "ttm-rollout-metrics";
const customItemsStorageKey = "ttm-business-standard-items";
const streamInfluenceStorageKey = "ttm-business-standard-stream-metrics";

const quarters = ["2026 Q1", "2026 Q2", "2026 Q3", "2026 Q4"];
const businessStandardTeams = [
  "Дашборд и навигация НИБ",
  "UX-долг АБ",
  "Дашборд и навигация КИБ",
  "Единая незавершенка",
  "Дизайн-система НИБ",
  "АЛБО",
  "Платформа Digital Sales",
  "Витрина и Лендинги",
  "Письма",
  "Нотификации",
  "Чат платформа",
  "Spotlight",
  "AlfaGen",
];

const createMetric = (plannedImpact = "", actualImpact = ""): InfluenceMetric => ({
  id: `metric-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  plannedImpact,
  actualImpact,
});

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // File-based previews in embedded browsers can block localStorage.
  }
};

const normalizeStoredInfluence = (raw: InfluenceDraft | Record<string, Partial<{ metrics: InfluenceMetric[]; plannedImpact: string; actualImpact: string; hypothesis: string; fact: string }>>): InfluenceDraft =>
  Object.fromEntries(
    Object.entries(raw).map(([itemId, value]) => {
      if (Array.isArray(value.metrics)) {
        return [
          itemId,
          {
            metrics: value.metrics.map((metric: InfluenceMetric) => ({
              id: metric.id || createMetric().id,
              plannedImpact: metric.plannedImpact ?? "",
              actualImpact: metric.actualImpact ?? "",
            })),
          },
        ];
      }

      const plannedImpact = value.plannedImpact ?? value.hypothesis ?? "";
      const actualImpact = value.actualImpact ?? value.fact ?? "";

      return [
        itemId,
        {
          metrics: plannedImpact || actualImpact ? [createMetric(plannedImpact, actualImpact)] : [],
        },
      ];
    }),
  );

export function RolloutTab({ items, streams, isAdmin }: RolloutTabProps) {
  const [customItems, setCustomItems] = useState<BusinessStandardRow[]>(() => readJson<BusinessStandardRow[]>(customItemsStorageKey, []));
  const [quarter, setQuarter] = useState("all");
  const [product, setProduct] = useState("all");
  const [title, setTitle] = useState("");
  const [newQuarter, setNewQuarter] = useState("2026 Q2");
  const [streamId, setStreamId] = useState(streams[0]?.id ?? "");
  const [teamName, setTeamName] = useState(businessStandardTeams[0] ?? "");
  const [plannedImpact, setPlannedImpact] = useState("");
  const [actualImpact, setActualImpact] = useState("");
  const [influence, setInfluence] = useState<InfluenceDraft>(() => normalizeStoredInfluence(readJson(influenceStorageKey, {})));
  const [streamInfluence, setStreamInfluence] = useState<InfluenceDraft>(() => normalizeStoredInfluence(readJson(streamInfluenceStorageKey, {})));

  const rows = useMemo<BusinessStandardRow[]>(() => [...customItems, ...items], [customItems, items]);
  const selectedStream = streams.find((stream) => stream.id === streamId) ?? streams[0];
  const filterQuarters = useMemo(() => ["all", ...Array.from(new Set([...quarters, ...rows.map((item) => item.epicQuarter)])).filter(Boolean).sort()], [rows]);
  const products = useMemo(() => ["all", ...Array.from(new Set(streams.map((stream) => stream.name))).filter(Boolean).sort()], [streams]);

  useEffect(() => {
    writeJson(customItemsStorageKey, customItems);
  }, [customItems]);

  useEffect(() => {
    writeJson(influenceStorageKey, influence);
  }, [influence]);

  useEffect(() => {
    writeJson(streamInfluenceStorageKey, streamInfluence);
  }, [streamInfluence]);

  const visibleItems = useMemo(
    () =>
      rows
        .filter((item) => quarter === "all" || item.epicQuarter === quarter)
        .filter((item) => product === "all" || item.streamName === product)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.streamName.localeCompare(b.streamName)),
    [rows, quarter, product],
  );

  const summary = useMemo(() => {
    const withMetrics = rows.filter((item) =>
      (influence[item.id]?.metrics ?? []).some((metric) => metric.plannedImpact.trim() || metric.actualImpact.trim()),
    ).length;

    return {
      total: rows.length,
      withMetrics,
      withoutMetrics: rows.length - withMetrics,
    };
  }, [rows, influence]);

  const streamMetricSummary = useMemo(
    () =>
      streams.map((stream) => {
        const metrics = streamInfluence[stream.id]?.metrics ?? [];
        const filledMetricCount = metrics.filter((metric) => metric.plannedImpact.trim() || metric.actualImpact.trim()).length;

        return {
          streamId: stream.id,
          streamName: stream.name,
          metrics,
          filledMetricCount,
          plannedMetrics: metrics.filter((metric) => metric.plannedImpact.trim()),
          actualMetrics: metrics.filter((metric) => metric.actualImpact.trim()),
        };
      }),
    [streams, streamInfluence],
  );

  const addStreamMetric = (targetStreamId: string) => {
    setStreamInfluence((current) => ({
      ...current,
      [targetStreamId]: {
        metrics: [...(current[targetStreamId]?.metrics ?? []), createMetric()],
      },
    }));
  };

  const removeStreamMetric = (targetStreamId: string, metricId: string) => {
    setStreamInfluence((current) => ({
      ...current,
      [targetStreamId]: {
        metrics: (current[targetStreamId]?.metrics ?? []).filter((metric) => metric.id !== metricId),
      },
    }));
  };

  const updateStreamMetric = (targetStreamId: string, metricId: string, field: "plannedImpact" | "actualImpact", value: string) => {
    setStreamInfluence((current) => ({
      ...current,
      [targetStreamId]: {
        metrics: (current[targetStreamId]?.metrics ?? []).map((metric) => (metric.id === metricId ? { ...metric, [field]: value } : metric)),
      },
    }));
  };

  const getMetrics = (itemId: string) => influence[itemId]?.metrics ?? [];

  const addMetric = (itemId: string) => {
    setInfluence((current) => ({
      ...current,
      [itemId]: {
        metrics: [...(current[itemId]?.metrics ?? []), createMetric()],
      },
    }));
  };

  const removeMetric = (itemId: string, metricId: string) => {
    setInfluence((current) => ({
      ...current,
      [itemId]: {
        metrics: (current[itemId]?.metrics ?? []).filter((metric) => metric.id !== metricId),
      },
    }));
  };

  const updateMetric = (itemId: string, metricId: string, field: "plannedImpact" | "actualImpact", value: string) => {
    setInfluence((current) => ({
      ...current,
      [itemId]: {
        metrics: (current[itemId]?.metrics ?? []).map((metric) => (metric.id === metricId ? { ...metric, [field]: value } : metric)),
      },
    }));
  };

  const addBusinessEpic = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !selectedStream) return;

    const id = `business-standard-${Date.now()}`;
    const nextItem: BusinessStandardRow = {
      id,
      key: "",
      title: trimmedTitle,
      status: "",
      streamName: selectedStream.name,
      teamId: teamName,
      teamName: teamName || "Не указана",
      keyResult: "",
      epicQuarter: newQuarter,
      createdAt: new Date().toISOString(),
      ttmDays: 0,
      idleDays: 0,
    };

    setCustomItems((current) => [nextItem, ...current]);
    setInfluence((current) => ({
      ...current,
      [id]: {
        metrics: [createMetric(plannedImpact, actualImpact)],
      },
    }));
    setTitle("");
    setPlannedImpact("");
    setActualImpact("");
  };

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="label">Бизнес-стандарт</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            Квартал эпика
            <select className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm lg:w-44" value={quarter} onChange={(event) => setQuarter(event.target.value)}>
              {filterQuarters.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "Все кварталы" : item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-ink">
            Продукт
            <select className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm lg:w-44" value={product} onChange={(event) => setProduct(event.target.value)}>
              {products.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "Все продукты" : item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isAdmin ? (
        <div className="mt-5 rounded-lg border border-line bg-surface/50 p-4">
          <p className="label">Администрирование</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1.5fr_0.8fr_1fr_1fr]">
            <label className="text-sm font-medium text-ink">
              Эпик
              <input className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-ink">
              Квартал
              <select className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" value={newQuarter} onChange={(event) => setNewQuarter(event.target.value)}>
                {quarters.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-ink">
              Стрим
              <select className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" value={streamId} onChange={(event) => setStreamId(event.target.value)}>
                {streams.map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-ink">
              Команда
              <select className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" value={teamName} onChange={(event) => setTeamName(event.target.value)}>
                {businessStandardTeams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-medium text-ink">
              Планируемое влияние
              <textarea className="mt-1 min-h-20 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm" value={plannedImpact} onChange={(event) => setPlannedImpact(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-ink">
              Фактическое влияние
              <textarea className="mt-1 min-h-20 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm" value={actualImpact} onChange={(event) => setActualImpact(event.target.value)} />
            </label>
            <button type="button" onClick={addBusinessEpic} className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
              <Plus size={16} />
              Добавить эпик
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="label">Всего эпиков</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{summary.total}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="label text-emerald-800">С метриками</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-800">{summary.withMetrics}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="label text-amber-800">Поля пустые</p>
          <p className="mt-2 text-3xl font-semibold text-amber-800">{summary.withoutMetrics}</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-white p-4">
        <div>
          <p className="label">Сводная аналитика</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">На какие метрики работает стрим</h2>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {streamMetricSummary.map((stream) => (
            <div key={stream.streamId} className="rounded-lg border border-line bg-surface/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-ink">{stream.streamName}</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-muted">{stream.filledMetricCount}</span>
              </div>
              {isAdmin ? (
                <div className="mt-3 space-y-3">
                  {stream.metrics.map((metric) => (
                    <div key={metric.id} className="rounded-lg bg-white p-3">
                      <div className="mb-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeStreamMetric(stream.streamId, metric.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:border-red-200 hover:text-red-600"
                          title="Удалить метрику"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="grid gap-3">
                        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                          Планируемое влияние
                          <textarea
                            className="mt-1 min-h-20 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-ink"
                            value={metric.plannedImpact}
                            onChange={(event) => updateStreamMetric(stream.streamId, metric.id, "plannedImpact", event.target.value)}
                          />
                        </label>
                        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                          Фактическое влияние
                          <textarea
                            className="mt-1 min-h-20 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-ink"
                            value={metric.actualImpact}
                            onChange={(event) => updateStreamMetric(stream.streamId, metric.id, "actualImpact", event.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addStreamMetric(stream.streamId)}
                    className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-slate-300"
                  >
                    <Plus size={16} />
                    Добавить метрику
                  </button>
                </div>
              ) : stream.filledMetricCount ? (
                <div className="mt-3 space-y-3">
                  {stream.plannedMetrics.length ? (
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Планируемое влияние</p>
                      <div className="mt-2 space-y-2">
                        {stream.plannedMetrics.map((metric) => (
                          <p key={`${metric.id}-planned`} className="break-words border-t border-line pt-2 text-sm font-medium text-ink first:border-t-0 first:pt-0">
                            {metric.plannedImpact}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {stream.actualMetrics.length ? (
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Фактическое влияние</p>
                      <div className="mt-2 space-y-2">
                        {stream.actualMetrics.map((metric) => (
                          <p key={`${metric.id}-actual`} className="break-words border-t border-line pt-2 text-sm font-medium text-ink first:border-t-0 first:pt-0">
                            {metric.actualImpact}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">Заполненных метрик пока нет</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden">
        {visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">Эпиков пока нет</div>
        ) : (
          <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
            <colgroup>
              <col className="w-[42%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-muted">
                <th className="border-b border-line py-3 pr-4">Эпик</th>
                <th className="border-b border-line px-4">Квартал</th>
                <th className="border-b border-line px-4">Стрим</th>
                <th className="border-b border-line px-4">Команда</th>
                <th className="border-b border-line px-4">Ключевой результат</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const metrics = getMetrics(item.id);

                return (
                  <tr key={item.id}>
                    <td className="border-b border-line py-3 pr-4 align-top">
                      <p className="break-words font-medium text-ink">{item.title}</p>
                      <div className="mt-3 space-y-3">
                        {metrics.map((metric) => (
                          <div key={metric.id} className="rounded-lg border border-line bg-surface/40 p-3">
                            <div className="mb-2 flex items-center justify-end gap-3">
                              <button type="button" onClick={() => removeMetric(item.id, metric.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted transition hover:border-red-200 hover:text-red-600" title="Удалить метрику">
                                <Trash2 size={15} />
                              </button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                                Планируемое влияние
                                <textarea className="mt-1 min-h-20 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-ink" value={metric.plannedImpact} onChange={(event) => updateMetric(item.id, metric.id, "plannedImpact", event.target.value)} />
                              </label>
                              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                                Фактическое влияние
                                <textarea className="mt-1 min-h-20 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-ink" value={metric.actualImpact} onChange={(event) => updateMetric(item.id, metric.id, "actualImpact", event.target.value)} />
                              </label>
                            </div>
                          </div>
                        ))}

                        <button type="button" onClick={() => addMetric(item.id)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-slate-300">
                          <Plus size={16} />
                          Добавить метрику
                        </button>
                      </div>
                    </td>
                    <td className="border-b border-line px-4 align-top">
                      <span className="inline-flex max-w-full rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ink">{item.epicQuarter}</span>
                    </td>
                    <td className="break-words border-b border-line px-4 align-top font-medium text-ink">{item.streamName}</td>
                    <td className="break-words border-b border-line px-4 align-top text-muted">{item.teamName ?? "Не указана"}</td>
                    <td className="border-b border-line px-4 align-top text-muted">
                      <p className="break-words">{item.keyResult || "-"}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
