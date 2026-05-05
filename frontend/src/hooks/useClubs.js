import { useState, useEffect } from 'react';
import { clubsApi } from '../api/clubs.api';

export function useClubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClubs = async () => {
    try {
      const data = await clubsApi.getAll();
      setClubs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClubs(); }, []);

  return { clubs, loading, refreshClubs: fetchClubs };
}