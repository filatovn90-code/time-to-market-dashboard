import { useEffect, useMemo, useState } from "react";
import { AdminIdleEpicForm } from "./components/AdminIdleEpicForm";
import { AdminMetricsPanel } from "./components/AdminMetricsPanel";
import { DirectionSummary } from "./components/DirectionSummary";
import { EpicIdleSection } from "./components/EpicIdleSection";
import { HeaderFilters } from "./components/HeaderFilters";
import { RolloutTab } from "./components/RolloutTab";
import { SidebarTabs, type DashboardTab } from "./components/SidebarTabs";
import { StageBreakdown } from "./components/StageBreakdown";
import { StreamCards } from "./components/StreamCards";
import { StreamStageBreakdown } from "./components/StreamStageBreakdown";
import { mockData } from "./data/mockData";
import type { Direction, Epic, Period, Stream, Team } from "./types";

type DashboardData = {
  direction: Direction;
  streams: Stream[];
  teams: Team[];
  epics: Epic[];
};

type ReportSnapshot = {
  reportDate: string;
  fileName: string;
  direction: Pick<Direction, "ttm" | "p85" | "average">;
};

type MetricPatch = Partial<Pick<Direction, "ttm" | "discovery" | "delivery" | "rollout" | "previousTtm">>;

const snapshotStorageKey = "ttm-dashboard-report-snapshots";
const manualDataStorageKey = "ttm-dashboard-manual-data";

const initialDashboardData: DashboardData = {
  direction: mockData.direction,
  streams: mockData.streams,
  teams: mockData.teams,
  epics: mockData.epics,
};

const makeSnapshot = (data: DashboardData, fileName: string, reportDate = "21.05.2026"): ReportSnapshot => ({
  reportDate,
  fileName,
  direction: {
    ttm: data.direction.ttm,
    p85: data.direction.p85,
    average: data.direction.average,
  },
});

const readSnapshots = () => {
  try {
    const raw = window.localStorage.getItem(snapshotStorageKey);
    if (!raw) return null;
    return JSON.parse(raw) as { current?: ReportSnapshot; previous?: ReportSnapshot };
  } catch {
    return null;
  }
};

const readManualData = () => {
  try {
    const raw = window.localStorage.getItem(manualDataStorageKey);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardData;
  } catch {
    return null;
  }
};

const writeManualData = (data: DashboardData) => {
  try {
    window.localStorage.setItem(manualDataStorageKey, JSON.stringify(data));
  } catch {
    // Ручной ввод остается доступен даже если браузер запретил localStorage.
  }
};

const syncDirectionStreams = (data: Omit<DashboardData, "direction"> & { direction: Direction }) => ({
  ...data,
  direction: {
    ...data.direction,
    streams: data.streams,
  },
});

function App() {
  const [period, setPeriod] = useState<Period>("Q2");
  const [selectedStreamId, setSelectedStreamId] = useState(() => initialDashboardData.streams[0]?.id ?? "all");
  const [idleStreamId, setIdleStreamId] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const valueType = "Median" as const;
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [dashboardData, setDashboardData] = useState<DashboardData>(() => readManualData() ?? initialDashboardData);
  const [reportSnapshots] = useState(() => {
    const saved = readSnapshots();
    return {
      current: saved?.current ?? makeSnapshot(initialDashboardData, "Встроенные данные"),
      previous: saved?.previous,
    };
  });

  const { direction, streams, teams, epics } = dashboardData;
  const { tasks } = mockData;

  useEffect(() => {
    writeManualData(dashboardData);
  }, [dashboardData]);

  const updateDirectionMetrics = (patch: MetricPatch) => {
    setDashboardData((current) => {
      const directionNext = { ...current.direction, ...patch };
      if (patch.ttm !== undefined) {
        directionNext.p85 = patch.ttm;
        directionNext.average = patch.ttm;
      }
      return syncDirectionStreams({ ...current, direction: directionNext });
    });
  };

  const updateStreamMetrics = (targetStreamId: string, patch: MetricPatch) => {
    setDashboardData((current) => {
      const streamsNext = current.streams.map((stream) => {
        if (stream.id !== targetStreamId) return stream;
        const streamNext = { ...stream, ...patch };
        if (patch.ttm !== undefined) {
          streamNext.p85 = patch.ttm;
          streamNext.average = patch.ttm;
        }
        return streamNext;
      });

      return syncDirectionStreams({ ...current, streams: streamsNext });
    });
  };

  const addIdleEpic = (epic: Epic) => {
    setDashboardData((current) => {
      const epicsNext = [epic, ...current.epics];
      const streamsNext = current.streams.map((stream) =>
        stream.id === epic.streamId ? { ...stream, epics: [epic, ...stream.epics] } : stream,
      );

      return syncDirectionStreams({ ...current, streams: streamsNext, epics: epicsNext });
    });
  };

  const visibleStreams = streams;
  const visibleEpics = epics;
  const visibleTasks = tasks;

  const selectedForDetails = streams.some((stream) => stream.id === selectedStreamId) ? selectedStreamId : streams[0]?.id ?? "all";

  return (
    <div className="min-h-screen bg-surface">
      <HeaderFilters period={period} isAdmin={isAdmin} onAdminToggle={() => setIsAdmin((current) => !current)} onPeriodChange={setPeriod} />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="min-w-0 space-y-6">
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm text-muted sm:flex-row sm:items-center">
            <span>
              Период: <strong className="text-ink">{period}</strong>
            </span>
          </div>

          {activeTab === "overview" ? (
            <>
              {isAdmin ? (
                <AdminMetricsPanel
                  direction={direction}
                  streams={streams}
                  onDirectionChange={updateDirectionMetrics}
                  onStreamChange={updateStreamMetrics}
                />
              ) : null}
              <DirectionSummary direction={direction} valueType={valueType} previousSnapshot={reportSnapshots.previous} />
              <StageBreakdown title="Дирекция" source={direction} />
              <StreamCards streams={visibleStreams} selectedStreamId={selectedForDetails} valueType={valueType} onSelect={setSelectedStreamId} />
              <StreamStageBreakdown streams={visibleStreams} selectedStreamId={selectedForDetails} />
            </>
          ) : null}

          {activeTab === "idle" ? (
            <>
              {isAdmin ? <AdminIdleEpicForm period={period} streams={streams} onAdd={addIdleEpic} /> : null}
              <EpicIdleSection
                epics={visibleEpics}
                streams={streams}
                tasks={visibleTasks}
                selectedStreamId={idleStreamId}
                onStreamChange={setIdleStreamId}
              />
            </>
          ) : null}

          {activeTab === "rollout" ? <RolloutTab items={[]} streams={streams} isAdmin={isAdmin} /> : null}
        </main>
      </div>
    </div>
  );
}

export default App;
