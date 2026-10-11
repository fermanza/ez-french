# Bonjour

A little French, every day. A small, local-first French study app built with **Tauri 2, TypeScript, and Vite** for **macOS and Windows**.

## What you can do

- Follow eight A1 lessons across First words and Everyday life: greetings, introductions, politeness, numbers, café orders, family, directions, and daily routines.
- Work through 48 multiple-choice, translation, and sentence-building exercises with explanations and retries. Translation checking accepts accents, punctuation, and explicitly supported alternate answers.
- Complete a six-question daily practice mix from unlocked lessons.
- Search vocabulary, bookmark words, and hear French pronunciation using an installed French system voice.
- Track XP, daily goals, lesson accuracy, calendar-day streaks, and achievements.
- Customize your name, daily goal, and audio. Progress is stored locally on the device, with no account or server.

Lessons unlock in sequence. The first completion awards each lesson’s XP; reviews improve your best score and count toward your streak. Practice awards 15 XP once per local calendar day. Choose the 15 XP refresher goal to maintain your habit after finishing the course. Lesson minutes are estimates based on completed lesson durations.

## Run it

Install Node.js 22.12+ and pnpm 11.25.0. For desktop development, also install Rust 1.90+ and the operating-system requirements in the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/):

- **macOS 12+:** Xcode Command Line Tools (`xcode-select --install`) and Rust.
- **Windows:** Microsoft C++ Build Tools with the Desktop development with C++ workload, the Windows SDK, Rust’s MSVC toolchain, and Microsoft Edge WebView2.

```sh
pnpm install
pnpm tauri dev
```

To preview just the interface in your browser:

```sh
pnpm dev
```

Open `http://127.0.0.1:1420`. Browser and desktop progress use separate storage. After installation, lessons and saved progress work without a network connection. Pronunciation requires a French voice available to the system’s webview; if unavailable, the app explains how to add one.

## Check and build

```sh
npm test
pnpm build
pnpm tauri build
```

Native installers must be built on the corresponding operating system. macOS produces `.app` and `.dmg` bundles; Windows produces an NSIS `.exe` installer. Windows installation can download WebView2 when the runtime is absent. Installers appear in `src-tauri/target/release/bundle/`.

The included [desktop build workflow](.github/workflows/desktop-build.yml) tests and builds on Apple Silicon macOS, Intel macOS, and Windows x64, then uploads installers as GitHub Actions artifacts. It runs on pull requests, pushes to `main`/`master`, version tags, and manual dispatch. It does not publish releases. Commit both `pnpm-lock.yaml` and `src-tauri/Cargo.lock` for reproducible CI builds.

The macOS build uses ad hoc signing for local development. Public distribution requires your own Apple Developer signing/notarization configuration. Windows builds are unsigned unless you configure a signing certificate. See [Tauri distribution](https://v2.tauri.app/distribute/).

## Project layout

```text
src/main.ts                  Screens, exercises, audio, and local persistence
src/styles.css               Responsive interface and accessible focus styles
src/data/lessons.ts           Typed French curriculum
src/lib/progress.ts           Scoring, unlocking, streaks, storage sanitation
src/lib/progress.test.ts      Curriculum and learning logic tests
src-tauri/                   Rust desktop shell, capabilities, platform configs
.github/workflows/           Native macOS and Windows builds
```

The frontend has no production JavaScript dependencies. The desktop shell grants only the default core Tauri capability and does not expose filesystem, shell, or network plugins. System fonts and illustrations ship with the app. Settings include a confirmation step before resetting saved progress.

To regenerate platform icons after changing the source logo:

```sh
pnpm tauri icon src-tauri/icons/bonjour.svg
```
