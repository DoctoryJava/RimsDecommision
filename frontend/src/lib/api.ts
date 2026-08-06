import axios from 'axios';

export interface Result<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PageResult<T> {
  total: number;
  list: T[];
  pageNum: number;
  pageSize: number;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// JWT 注入
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rims_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 统一 Result 解包 + 错误提示
api.interceptors.response.use(
  (res) => {
    const data = res.data as Result<unknown>;
    // 后端已按 Result 包装，若 code !=200 则抛错
    if (data && typeof data.code === 'number' && data.code !== 200) {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rims_token');
      localStorage.removeItem('rims_user');
      // 不在这里强制跳转，避免循环
    }
    const msg = err.response?.data?.message || err.message || '网络错误';
    return Promise.reject(new Error(msg));
  }
);

export default api;

// 便捷方法
export async function login(username: string, password: string) {
  // 后端接受 {username, password}，兼容 email 作为 username
  const res = await api.post<Result<{ token: string; userId: number; username: string; realName: string }>>('/auth/login', {
    username,
    email: username,
    password,
  });
  return (res.data as Result<{ token: string; userId: number; username: string; realName: string }>).data;
}

export async function getUserInfo() {
  const res = await api.get<Result<{ username: string; email: string; roles: string[]; permissions: string[] }>>('/auth/user-info');
  return (res.data as Result<{ username: string; email: string; roles: string[]; permissions: string[] }>).data;
}

export async function logout() {
  const res = await api.post<Result<null>>('/auth/logout');
  return res.data;
}
