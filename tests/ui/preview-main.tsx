import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { AppShell } from "../../src/app/AppShell";
import { CurrentAccountDashboard } from "../../src/components/dashboard/CurrentAccountDashboard";
import { TopToolbar } from "../../src/components/layout/TopToolbar";
import { LanguageProvider } from "../../src/lib/i18n";
import { OtherAccountsPage } from "../../src/pages/OtherAccountsPage";
import { UsageStatsPage } from "../../src/pages/UsageStatsPage";
import { fixtureAccount, fixtureStats } from "./fixtures";
import "../../src/App.css";
import "../../src/styles/tokens.css";
import "../../src/styles/layout.css";
import "../../src/styles/themes.css";

function Preview() {
  const scenario = new URLSearchParams(window.location.search).get("scenario");
  const stateful = scenario === "stateful";
  const statsScenario = scenario === "stats";
  const otherAccountsScenario = scenario === "other-accounts";
  const [collapsed, setCollapsed] = useState(false);
  const [account, setAccount] = useState(fixtureAccount);
  const [renameResult, setRenameResult] = useState("");
  const [warmingUp, setWarmingUp] = useState(false);
  const [warmupCount, setWarmupCount] = useState(0);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteResult, setDeleteResult] = useState("");
  const [closeRequested, setCloseRequested] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statsAccountId, setStatsAccountId] = useState("other-account");
  const otherAccount = {
    ...fixtureAccount,
    id: "other-account",
    name: "Second Account",
    email: "second@example.com",
    is_active: false,
    auth_mode: "api_key" as const,
    usage: fixtureAccount.usage ? { ...fixtureAccount.usage, account_id: "other-account" } : undefined,
  };
  const accounts = [account, otherAccount];
  const visibleOtherAccounts = [otherAccount].filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    return !query || item.name.toLowerCase().includes(query) || item.email?.toLowerCase().includes(query);
  });
  const statefulStats = stateful
    ? {
        ...fixtureStats,
        reset_credits: {
          available_count: 1,
          next_expires_at: "2026-09-30T12:00:00Z",
          credits: [{
            id: "reset-1",
            reset_type: "codex_rate_limits",
            status: "available",
            granted_at: "2026-09-15T00:00:00Z",
            expires_at: "2026-09-30T12:00:00Z",
            redeem_started_at: null,
            redeemed_at: null,
            title: "Fixture reset",
            description: null,
          }],
        },
      }
    : fixtureStats;
  return (
    <AppShell
      activePage={statsScenario ? "usage-stats" : otherAccountsScenario ? "other-accounts" : "current-account"}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((value) => !value)}
      onNavigate={() => {}}
      activeAccount={account}
      toolbar={
        <TopToolbar
          title={statsScenario ? "使用统计" : otherAccountsScenario ? "其他账户" : "当前账户"}
          description="当前账户与额度概览"
          processInfo={{ count: 1, background_count: 0, can_switch: false, pids: [1] }}
          allMasked={false}
          refreshing={false}
          warmingAll={false}
          accountsCount={1}
          onToggleMaskAll={() => {}}
          onRefresh={() => {}}
          onWarmupAll={() => {}}
          onAddAccount={() => {}}
          onCloseCodex={stateful ? () => setCloseRequested(true) : undefined}
          actions={[{ label: "检查更新", icon: "download", onSelect: () => {} }]}
        />
      }
    >
      <div className="app-content-inner">
        {statsScenario ? (
          <UsageStatsPage
            accounts={accounts}
            selectedAccountId={statsAccountId}
            onSelectedAccountChange={setStatsAccountId}
            masked={new Set(["other-account"])}
          />
        ) : otherAccountsScenario ? (
          <OtherAccountsPage
            accounts={accounts}
            visibleOtherAccounts={visibleOtherAccounts}
            otherAccounts={[otherAccount]}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchEnabled
            sort="deadline_asc"
            onSortChange={() => {}}
            view="grid"
            onViewChange={() => {}}
            masked={new Set()}
            switchingId={null}
            processRunning={false}
            warmingUpId={null}
            warmingAll={false}
            autoWarmupEnabled={() => false}
            autoWarmupManagedByAll={false}
            autoWarmupLabel={() => "已禁用"}
            autoWarmupRunning={() => false}
            onSwitch={() => {}}
            onOpenInBrowser={() => {}}
            onRefresh={async () => {}}
            onWarmup={async () => {}}
            onRename={async (id, name) => {
              if (id === account.id) setAccount((current) => ({ ...current, name }));
            }}
            onRemove={() => {}}
            onToggleMask={() => {}}
            onToggleAutoWarmup={() => {}}
            onViewStats={() => {}}
          />
        ) : (
        <CurrentAccountDashboard
          account={account}
          masked={false}
          stats={statefulStats}
          statsLoading={false}
          statsError={null}
          onOpenInBrowser={() => {}}
          onRefresh={() => {}}
          onWarmup={() => {
            if (warmingUp) return;
            setWarmupCount((count) => count + 1);
            setWarmingUp(true);
          }}
          warmingUp={warmingUp}
          onRename={async (name) => {
            setAccount((current) => ({ ...current, name }));
            setRenameResult(name);
          }}
          onToggleMask={() => {}}
          onToggleAutoWarmup={() => {}}
          autoWarmupEnabled
          autoWarmupManagedByAll={stateful}
          autoWarmupLabel="已启用"
          deleteConfirmationPending={deletePending}
          onDelete={(confirmed) => {
            if (confirmed) setDeleteResult("deleted");
            else setDeletePending(true);
          }}
          onRefreshStats={() => {}}
          onViewFullStats={() => {}}
        />
        )}
        {stateful && (
          <div className="sr-only" aria-live="polite">
            <span data-testid="rename-result">{renameResult}</span>
            <span data-testid="warmup-count">{warmupCount}</span>
            <span data-testid="delete-pending">{deletePending ? "pending" : "idle"}</span>
            <span data-testid="delete-result">{deleteResult}</span>
            <span data-testid="close-requested">{closeRequested ? "requested" : "idle"}</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}

window.localStorage.setItem("codex-switcher-language", "zh-CN");
const skin = new URLSearchParams(window.location.search).get("skin");
if (skin && skin !== "default") {
  document.documentElement.setAttribute("data-skin", skin);
} else {
  document.documentElement.removeAttribute("data-skin");
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <LanguageProvider><Preview /></LanguageProvider>,
);
