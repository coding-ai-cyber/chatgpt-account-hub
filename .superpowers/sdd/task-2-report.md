# Task 2 Report: Rust language persistence and commands

## Result

Status: DONE

Code commit: `f0311e6` (`feat: persist application language`)

## Changed files

- `src-tauri/src/types.rs`
  - Added `AppLanguage::{ZhCn, En}`.
  - Added `AppLanguage::parse`, `AppLanguage::from_setting`, and `AppLanguage::as_str`.
  - Added `AppSettings.language` with serde defaulting to `zh-CN`.
  - Added/extended unit tests for language defaults, parsing, invalid fallback, string mapping, and missing `settings.json` language field.
- `src-tauri/src/commands/window.rs`
  - Added Tauri command `get_language() -> String`.
  - Added shared `persist_language(language: &str) -> Result<AppLanguage, String>`.
  - Added Tauri command `set_language(app: AppHandle, language: String) -> Result<(), String>`.
  - `set_language` persists the validated language and refreshes native app menu/tray on desktop builds.
- `src-tauri/src/web.rs`
  - Added `LanguageArgs`.
  - Added `/api/invoke/get_language`.
  - Added `/api/invoke/set_language`, using `commands::window::persist_language()` without `AppHandle`.
- `src-tauri/src/lib.rs`
  - Registered `get_language` and `set_language` in the Tauri invoke handler.

Preserved/unmodified:

- Did not stage or commit the pre-existing `src-tauri/Cargo.toml` modification.
- Did not touch account credentials or `auth.json`.
- Did not reset Task 1 commits or plan documents.

## TDD red evidence

Command:

```powershell
cmd.exe /d /s /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set "PATH=C:\Users\Administrator\.cargo\bin;%PATH%" && cargo test --manifest-path src-tauri/Cargo.toml language_tests'
```

Result: exit code `1`.

Key output:

```text
error[E0432]: unresolved import `super::AppLanguage`
  --> src\types.rs:64:9
   |
64 |     use super::AppLanguage;
   |         ^^^^^^^-----------
   |                |
   |                no `AppLanguage` in `types`
error: could not compile `codex-switcher` (lib test) due to 1 previous error
```

This confirmed the existing `language_tests` draft was red because the production interface was missing.

## Green evidence

Focused command:

```powershell
cmd.exe /d /s /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set "PATH=C:\Users\Administrator\.cargo\bin;%PATH%" && cargo test --manifest-path src-tauri/Cargo.toml language_tests'
```

Post-commit result: exit code `0`.

Key output:

```text
running 6 tests
test types::language_tests::app_settings_defaults_language_to_simplified_chinese ... ok
test types::language_tests::defaults_to_simplified_chinese ... ok
test types::language_tests::maps_languages_to_setting_values ... ok
test types::language_tests::rejects_unsupported_language_values ... ok
test types::language_tests::parses_supported_language_values ... ok
test types::language_tests::invalid_setting_falls_back_to_simplified_chinese ... ok

test result: ok. 6 passed; 0 failed; 0 ignored; 0 measured; 50 filtered out; finished in 0.00s
```

Full command:

```powershell
cmd.exe /d /s /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set "PATH=C:\Users\Administrator\.cargo\bin;%PATH%" && cargo test --manifest-path src-tauri/Cargo.toml'
```

Post-commit result: exit code `0`.

Key output:

```text
running 56 tests
...
test result: ok. 56 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.01s

Running unittests src\main.rs
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

Running unittests src\bin\codex-web.rs
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

Doc-tests codex_switcher_lib
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

## Self-review

- Verified the language enum only accepts the required persisted values: `zh-CN` and `en`.
- Verified `AppLanguage::from_setting` normalizes invalid stored values to `ZhCn`.
- Verified `AppSettings::default()` and serde missing-field fallback both produce `language = "zh-CN"`.
- Verified Tauri `set_language` uses the shared persistence path and refreshes desktop menu/tray after saving.
- Verified web `set_language` uses the shared persistence path and does not require `AppHandle`.
- Checked staging before code commit: only the four Task 2 Rust files were included.

## Concerns

- The Rust test output still contains pre-existing warnings unrelated to this task, including unused imports/items and linker stdout warnings. They do not fail the build.
- `src-tauri/Cargo.toml` remains modified in the working tree from pre-existing work and was intentionally not staged.
