import { useLanguage } from "../../lib/i18n";
import { Icon, type IconName } from "../layout/Icon";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: IconName;
}

export function MetricCard({ label, value, sub, icon }: MetricCardProps) {
  const { t } = useLanguage();
  return (
    <div className="app-surface p-3.5 min-w-0">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg app-surface-secondary app-accent">
            <Icon name={icon} size={15} />
          </span>
        )}
        <span className="min-w-0 truncate text-xs font-medium app-text-secondary">{label}</span>
      </div>
      <div className="metric-card-value mt-2.5 text-lg font-semibold app-text-primary">
        {value}
      </div>
      {sub && <div className="mt-0.5 truncate text-[11px] app-text-muted">{sub}</div>}
      {!sub && icon && <span className="sr-only">{t("noRateLimitData")}</span>}
    </div>
  );
}