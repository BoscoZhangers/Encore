# Frontend structure

The frontend is organized by ownership so a page or feature can be found without tracing a large shared file.

- `pages/` contains one route module per page. Page-only styles sit beside that module.
- `components/layout/` owns the persistent navigation, marketplace shell, branding, and footer.
- `components/marketplace/` owns marketplace discovery, listing sections/cards, the overview introduction, Cora activity, and hero animation.
- `components/create-item-wizard/` owns the complete five-step listing workflow. Each step has its own module; the orchestrator only handles navigation and validation.
- `components/messages/`, `components/account/`, `components/insights/`, `components/feedback/`, and `components/selling/` contain feature-specific reusable components.
- `hooks/` contains reusable data and browser-behavior hooks.
- `api.ts` is the frontend HTTP boundary, while `types.ts` contains shared frontend types.

## Styles

Component and page styles are colocated with their owners and use matching PascalCase names. `global.css` contains only design tokens, element defaults, and genuinely shared layout primitives.

`styles.ts` is the ordered style manifest imported by `main.tsx`. Keeping CSS imports out of component modules allows the Node-based component tests to import TSX directly without a CSS loader while retaining clear style ownership.

When adding a feature:

1. Put route composition in `pages/Feature.tsx`.
2. Extract reusable or stateful sections into an appropriate `components/feature/` folder.
3. Place page-only CSS beside the page and reusable CSS beside the component.
4. Add new CSS to `styles.ts` in dependency order.
