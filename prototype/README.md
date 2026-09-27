# 一齊學 · Cantonese Together

Deployable mobile-friendly prototype with individual local onboarding profiles.

## Deploy on GitHub + Vercel
1. Create a new GitHub repository. Upload `index.html`, `manifest.webmanifest`, and `icon.svg` to the repository root.
2. In Vercel, choose Add New > Project > Import Git Repository. Select this repository.
3. Framework preset: Other. No build command needed. Deploy.
4. Share the resulting public `vercel.app` URL. Each browser has its own locally saved onboarding and lesson progress.
5. On iOS Safari: Share > Add to Home Screen. On compatible Android browsers: Install app / Add to Home screen.

## Important limitations
This is a public static prototype, not yet a multi-account backend. Onboarding changes profile/context and does not dynamically generate individual lessons. Progress is stored in browser localStorage, not synchronised between devices. Browser/device storage deletion loses it. No real Cantonese recorded audio is bundled; browser speech requires a Cantonese voice. Do not enter sensitive information. For genuine per-account personalisation and sync, add authentication, a database with per-user access policies, and server-side curriculum generation.
