//! Native application menu text localization.

use crate::types::AppLanguage;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MenuTextKey {
    Tray,
    IconAndSession,
    HourlyAndWeekly,
    Hidden,
    DockIcon,
    ShowInDock,
    MenuBarOnly,
    ReopenCodexAfterForceClose,
    Settings,
    Window,
    Help,
    File,
    Edit,
    View,
    NoAccountsConfigured,
    OpenCodexSwitcher,
    Quit,
}

pub fn menu_text(language: AppLanguage, key: MenuTextKey) -> &'static str {
    match language {
        AppLanguage::ZhCn => match key {
            MenuTextKey::Tray => "托盘",
            MenuTextKey::IconAndSession => "图标 + 会话",
            MenuTextKey::HourlyAndWeekly => "每小时和每周",
            MenuTextKey::Hidden => "隐藏",
            MenuTextKey::DockIcon => "Dock 图标",
            MenuTextKey::ShowInDock => "在 Dock 中显示",
            MenuTextKey::MenuBarOnly => "仅菜单栏",
            MenuTextKey::ReopenCodexAfterForceClose => "强制关闭后重新打开 Codex",
            MenuTextKey::Settings => "设置",
            MenuTextKey::Window => "窗口",
            MenuTextKey::Help => "帮助",
            MenuTextKey::File => "文件",
            MenuTextKey::Edit => "编辑",
            MenuTextKey::View => "视图",
            MenuTextKey::NoAccountsConfigured => "未配置账户",
            MenuTextKey::OpenCodexSwitcher => "打开 ChatGPT 账号管家",
            MenuTextKey::Quit => "退出",
        },
        AppLanguage::En => match key {
            MenuTextKey::Tray => "Tray",
            MenuTextKey::IconAndSession => "Icon + Session",
            MenuTextKey::HourlyAndWeekly => "Hourly and weekly",
            MenuTextKey::Hidden => "Hidden",
            MenuTextKey::DockIcon => "Dock icon",
            MenuTextKey::ShowInDock => "Show in Dock",
            MenuTextKey::MenuBarOnly => "Menu bar only",
            MenuTextKey::ReopenCodexAfterForceClose => "Reopen Codex after force close",
            MenuTextKey::Settings => "Settings",
            MenuTextKey::Window => "Window",
            MenuTextKey::Help => "Help",
            MenuTextKey::File => "File",
            MenuTextKey::Edit => "Edit",
            MenuTextKey::View => "View",
            MenuTextKey::NoAccountsConfigured => "No accounts configured",
            MenuTextKey::OpenCodexSwitcher => "Open ChatGPT Account Hub",
            MenuTextKey::Quit => "Quit",
        },
    }
}

#[cfg(test)]
mod menu_text_tests {
    use super::{menu_text, MenuTextKey};
    use crate::types::AppLanguage;

    #[test]
    fn tray_title_is_localized() {
        assert_eq!(menu_text(AppLanguage::ZhCn, MenuTextKey::Tray), "托盘");
        assert_eq!(menu_text(AppLanguage::En, MenuTextKey::Tray), "Tray");
    }

    #[test]
    fn quit_is_localized() {
        assert_eq!(menu_text(AppLanguage::ZhCn, MenuTextKey::Quit), "退出");
        assert_eq!(menu_text(AppLanguage::En, MenuTextKey::Quit), "Quit");
    }

    #[test]
    fn every_custom_menu_key_has_chinese_and_english_text() {
        let keys = [
            MenuTextKey::Tray,
            MenuTextKey::IconAndSession,
            MenuTextKey::HourlyAndWeekly,
            MenuTextKey::Hidden,
            MenuTextKey::DockIcon,
            MenuTextKey::ShowInDock,
            MenuTextKey::MenuBarOnly,
            MenuTextKey::ReopenCodexAfterForceClose,
            MenuTextKey::Settings,
            MenuTextKey::Window,
            MenuTextKey::Help,
            MenuTextKey::File,
            MenuTextKey::Edit,
            MenuTextKey::View,
            MenuTextKey::NoAccountsConfigured,
            MenuTextKey::OpenCodexSwitcher,
            MenuTextKey::Quit,
        ];

        for key in keys {
            assert!(
                !menu_text(AppLanguage::ZhCn, key).is_empty(),
                "Chinese text is missing for {key:?}"
            );
            assert!(
                !menu_text(AppLanguage::En, key).is_empty(),
                "English text is missing for {key:?}"
            );
        }
    }
}
