import Cookies from 'js-cookie';
import api from './api';

export function saveToken(token: string) { Cookies.set('token', token, { expires: 1 }); }
export function removeToken() { Cookies.remove('token'); }
export function isLoggedIn(): boolean { return !!Cookies.get('token'); }

export function getTokenPayload(): { sub: string; username: string } | null {
  try {
    const token = Cookies.get('token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return null; }
}

export async function signup(username: string, email: string, password: string) {
  const res = await api.post('/api/auth/signup', { username, email, password });
  return res.data;
}

export async function login(
  email: string,
  password: string,
  onSuccess?: () => void
) {
  const res = await api.post('/api/auth/login', { email, password });
  saveToken(res.data.access_token);
  onSuccess?.();
  return res.data;
}

export function logout() {
  removeToken();
  window.location.href = '/login';
}