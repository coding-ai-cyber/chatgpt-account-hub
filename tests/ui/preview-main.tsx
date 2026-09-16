import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { AppShell } from "../../src/app/AppShell";
import { CurrentAccountDashboard } from "../../src/components/dashboard/CurrentAccountDashboard";
import { TopToolbar } from "../../src/components/layout/TopToolbar";
import { LanguageProvider } from "../../src/lib/i18n";
import { fixtureAccount, fixtureStats } from "./fixtures";
import "../../src/App.css";
import "../../src/styles/tokens.css";
import "../../src/styles/layout.css";
import "../../src/styles/themes.css";

function Preview() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AppShell
      activePage="current-account"
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((value) => !value)}
      onNavigate={() => {}}
      activeAccount={fixtureAccount}
      toolbar={
        <TopToolbar
          title="当前账户"
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
          actions={[{ label: "检查更新", icon: "download", onSelect: () => {} }]}
        />
      }
    >
      <div className="app-content-inner">
        <CurrentAccountDashboard
          account={fixtureAccount}
          masked={false}
          stats={fixtureStats}
          statsLoading={false}
          statsError={null}
          onOpenInBrowser={() => {}}
          onRefresh={() => {}}
          onWarmup={() => {}}
          onToggleMask={() => {}}
          onToggleAutoWarmup={() => {}}
          onDelete={() => {}}
          onRefreshStats={() => {}}
          onViewFullStats={() => {}}
        />
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
