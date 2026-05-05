import { useState, useEffect } from 'react';
import { adminApi } from '../api/admin.api';

export function useAdminDashboard() {
  const [stats, setStats] = useState({ users_count: 0, books_count: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [s, u] = await Promise.all([adminApi.getStats(), adminApi.getUsers()]);
      setStats(s);
      setUsers(u);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const changeRole = async (id, role) => {
    await adminApi.updateUserRole(id, role);
    loadData(); // Перезавантажуємо список
  };

  return { stats, users, loading, changeRole };
}