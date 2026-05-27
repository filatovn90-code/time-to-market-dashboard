import { BarChart3, LogIn, LogOut } from "lucide-react";
import type { Period } from "../types";

interface HeaderFiltersProps {
  period: Period;
  isAdmin: boolean;
  onAdminToggle: () => void;
  onPeriodChange: (period: Period) => void;
}

const periods: Period[] = ["Q1", "Q2", "Q3", "Q4", "Год"];

export function HeaderFilters({ period, isAdmin, onAdminToggle, onPeriodChange }: HeaderFiltersProps) {
  const AdminIcon = isAdmin ? LogOut : LogIn;

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
                <BarChart3 size={21} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Time-to-Market Dashboard</h1>
                <p className="mt-1 text-sm text-muted">Дирекция / Стримы / Этапы / Простои</p>
                {isAdmin ? <p className="mt-1 text-xs font-medium text-emerald-700">Режим администратора включен</p> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Период
              <select
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
                value={period}
                onChange={(event) => onPeriodChange(event.target.value as Period)}
              >
                {periods.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onAdminToggle}
              className="mt-6 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <AdminIcon size={16} />
              {isAdmin ? "Выйти" : "Войти как администратор"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
