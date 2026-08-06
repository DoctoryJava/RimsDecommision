# Frontend — Bolt.new Prototype (React 19 + Vite + Tailwind)

> **来源**：`project-bolt-sb1-pt4jvqwm.zip`（Bolt.new 生成）已解压至 `frontend/`。此为**高保真原型**，非 RIMS 规范的 Vue 3 + Element Plus 生产前端，但可直接用于 Demo 与后端联调。

## 技术栈
- React 19.2.8 + Vite 8.2.0 + Tailwind CSS 4.3.3 (`@tailwindcss/vite`)
- lucide-react + TypeScript 6 + @types/react 19
- 本地状态 `useState`，无 Pinia；路由为 `App.tsx` 手写 `PageKey` + `Sidebar`

## 运行

```bash
cd frontend
npm install   # 或 pnpm install（需删除 package-lock.json 后 pnpm import）
npm run dev   # http://localhost:5173
npm run build # tsc -b && vite build
```

> 初次运行需 `npm install`，Supabase 依赖未实际使用可移除，替换为 `axios` 对接后端。

## 页面清单（12 页）

- `LoginPage` / `DashboardPage` / `SystemsPage` (551行) / `DataSyncPage` / `SchemasPage`
- `QueryConfigsPage` (562行，Join 可视化) / `DynamicQueryPage` (371行，过滤/排序/分页/SQL预览)
- `DbInspectorPage` / `UsersPage` / `RolesPage` / `PermissionsPage` / `PagesPage` / `SettingsPage`

详见 `docs/BOLT_FRONTEND_ANALYSIS.md` §三。

## 与后端的联调

1. 删除 `@supabase/supabase-js`，新增 `axios`：
   ```bash
   npm remove @supabase/supabase-js && npm install axios
   ```
2. 创建 `src/lib/api.ts`：
   ```ts
   import axios from 'axios';
   export const api = axios.create({ baseURL: '/api' });
   api.interceptors.request.use(c => { c.headers.Authorization = `Bearer ${localStorage.token}`; return c; });
   ```
3. 将 `src/data/mockData.ts` 的 `systems/roles/permissions` 替换为 `api.get('/systems')` 等（契约见 `types.ts` ↔ 后端 `Result<T>`）。
4. 后端已提供 Mock API（`backend/src/main/java/.../controller/`），`vite.config.ts` 中配置代理：
   ```ts
   server: { proxy: { '/api': 'http://localhost:8080' } }
   ```

## 后续

- 生产建议按 `AGENTS.md` 重构为 Vue 3 + Element Plus + Pinia + Vue Router，或在当前 React 基础上持续迭代（需团队决策）。
- 详见 `docs/BOLT_FRONTEND_ANALYSIS.md` §六 后端初始化方案。

