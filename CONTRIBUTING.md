
# Contributing to GridGuard AI

First off, thank you for considering contributing to GridGuard AI! It's people like you that make the open-source community such an amazing place to learn, inspire, and create.

## 📜 Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🛠️ Development Setup

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally.
3.  **Install dependencies** using `npm install`.
4.  **Create a branch** for your feature or bug fix.
5.  **Run the app** with `npm start` to ensure it works.

## 🔀 Branch Naming

Please use the following naming convention for your branches:

*   `feature/description-of-feature`
*   `bugfix/description-of-bug`
*   `docs/description-of-change`
*   `refactor/description-of-change`

## 💬 Commit Messages

We follow the **Conventional Commits** specification. This helps us generate changelogs and version numbers automatically.

*   `feat: add new map visualization`
*   `fix: resolve sced dispatch overlap`
*   `docs: update readme with api keys`
*   `style: format charts.tsx`
*   `refactor: optimize agent orchestrator loop`

## 📥 Pull Request Process

1.  Ensure your code follows the existing style (Prettier/ESLint).
2.  Update the `README.md` or other docs with details of changes if relevant.
3.  The PR title should follow Conventional Commits (see above).
4.  Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
5.  Wait for code review and address any feedback.

## 🧪 Testing

*   Currently, manual testing via the "Demo Mode" is required.
*   Ensure that the "Safe Mode" interlocks (in `safetyGuard.ts`) are not bypassed by your changes.

## 🎨 Style Guidelines

*   **Components:** Functional React components with TypeScript interfaces.
*   **Styling:** Tailwind CSS utility classes. Avoid inline styles where possible.
*   **State:** Use React Hooks (`useState`, `useEffect`, `useRef`). Avoid complex global state libraries unless necessary (currently using simple Services/Singletons).

Thank you for your contributions!
