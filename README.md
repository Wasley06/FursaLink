<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/bc50de21-37e7-47fc-93e9-537984a76b4a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. (Optional) Set officer invite codes in `.env.local`:
   `VITE_INVITE_CONTROLLER_CODE`, `VITE_INVITE_CHAIRMAN_CODE`
4. Run the app:
   `npm run dev`

## Desktop Installers (Windows/macOS) + Auto-Update

This project can be packaged as a desktop app (Electron) with auto-updates via GitHub Releases.

### Run desktop locally

`npm run desktop:dev`

### Build installers

- Windows (NSIS): `npm run desktop:dist:win`
- macOS (DMG/ZIP): `npm run desktop:dist:mac` (must be built on macOS)

### Auto-update channel

Auto-updates are delivered from GitHub Releases created by the workflow at `.github/workflows/desktop-release.yml`.

1. Update `package.json` `repository.url` to your GitHub repo.
2. Push a tag like `v1.0.0` to trigger the workflow and publish the installers.
