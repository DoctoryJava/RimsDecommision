import { useState } from 'react';
import { HardDrive, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Database, Archive } from 'lucide-react';
import { login } from '@/lib/api';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('sarah.chen@company.com');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 优先走真实后端，失败回退到 mock 以保证 Demo 始终可用
      const useApi = import.meta.env.VITE_USE_API !== 'false';
      if (useApi) {
        try {
          const data = await login(email, password);
          localStorage.setItem('rims_token', data.token);
          localStorage.setItem('rims_user', JSON.stringify({ username: data.username, realName: data.realName }));
        } catch (apiErr: unknown) {
          const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
          // 网络不通时（如后端未启动）回退为 mock 登录，保证演示
          if (msg.includes('Network') || msg.includes('网络') || msg.includes('Failed to fetch')) {
            console.warn('[Login] API unreachable, fallback to mock:', msg);
          } else {
            throw apiErr;
          }
        }
      }
      onLogin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '登录失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Left panel — Brand / illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-neutral-950 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-neutral-950 to-secondary-950" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-secondary-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <HardDrive size={22} />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">Lifecycle</p>
              <p className="text-xs text-neutral-400">Data Retention Suite</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Preserve every system's data, even after decommission.
            </h1>
            <p className="text-neutral-400 text-lg leading-relaxed">
              Manage the full lifecycle of your systems — from active production to archived data retention — with automated Databricks sync and granular access control.
            </p>

            <div className="mt-10 space-y-4">
              {[
                { icon: ShieldCheck, title: 'Role-based access', desc: 'Assign users to systems with scoped permissions' },
                { icon: Database, title: 'Databricks sync', desc: 'Automatically mirror DB and storage data on decommission' },
                { icon: Archive, title: 'Compliance-ready archival', desc: 'Retain schemas and tables for audit and recovery' },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <f.icon size={18} className="text-primary-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-sm text-neutral-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-neutral-600">© 2026 Lifecycle Data Retention Suite. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <HardDrive size={22} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-900 tracking-tight">Lifecycle</p>
              <p className="text-xs text-neutral-500">Data Retention Suite</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-neutral-900 mb-1">Welcome back</h2>
          <p className="text-sm text-neutral-500 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-2.5 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-neutral-700">Password</label>
                <button type="button" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-11 py-2.5 text-sm rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-200" />
              <span className="text-sm text-neutral-600">Keep me signed in for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 active:bg-primary-700 shadow-sm shadow-primary-500/20 transition-all disabled:opacity-60"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-3 rounded-lg bg-primary-50 border border-primary-100">
            <p className="text-xs text-primary-700 text-center">
              Demo: <span className="font-mono">sarah.chen@company.com / demo1234</span>（任意 mock 用户均可，密码 demo1234）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
