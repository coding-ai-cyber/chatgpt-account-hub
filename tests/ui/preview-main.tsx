import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { AppShell } from "../../src/app/AppShell";
import { CurrentAccountHero } from "../../src/components/dashboard/CurrentAccountHero";
import { LanguageProvider } from "../../src/lib/i18n";
import { fixtureAccount } from "./fixtures";
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
      toolbar={<div className="app-toolbar app-toolbar-bg"><strong>当前账户</strong></div>}
    >
      <div className="app-content-inner">
        <CurrentAccountHero
          account={fixtureAccount}
          masked={false}
          onOpenInBrowser={() => {}}
          onRefresh={() => {}}
          onWarmup={() => {}}
          onToggleMask={() => {}}
          onToggleAutoWarmup={() => {}}
          onDelete={() => {}}
        />
      </div>
    </AppShell>
  );
}

window.localStorage.setItem("codex-switcher-language", "zh-CN");
ReactDOM.createRoot(document.getElementById("root")!).render(
  <LanguageProvider><Preview /></LanguageProvider>,
);
