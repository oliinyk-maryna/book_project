import { useState, useEffect } from 'react';
import { booksApi } from '../api/books.api';

export function useBookDetails(id) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    booksApi.getOne(id)
      .then(setBook)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status) => {
    try {
      await booksApi.updateStatus(id, status);
      setBook(prev => ({ ...prev, user_status: status }));
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return { book, loading, error, updateStatus };
}