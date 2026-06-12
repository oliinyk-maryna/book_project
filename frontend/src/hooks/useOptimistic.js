import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export function useOptimistic() {
  const pendingRef = useRef(new Set());

  /**
   * @param {Function} setStateFn    setState що застосовує зміну
   * @param {any}      optimisticVal нове значення (або функція-updater)
   * @param {Function} apiFn        async-функція з реальним запитом
   * @param {any}      rollbackVal  значення для відкату (або функція)
   * @param {string}   [errMsg]     повідомлення при помилці
   */
  const run = useCallback(async (setStateFn, optimisticVal, apiFn, rollbackVal, errMsg) => {
    const id = Symbol();
    pendingRef.current.add(id);

    // 1. Застосовуємо зміну одразу — без затримки
    setStateFn(typeof optimisticVal === 'function' ? optimisticVal : () => optimisticVal);

    try {
      await apiFn();
    } catch {
      // 2. При помилці — відкочуємо
      setStateFn(typeof rollbackVal === 'function' ? rollbackVal : () => rollbackVal);
      if (errMsg) toast.error(errMsg);
    } finally {
      pendingRef.current.delete(id);
    }
  }, []);

  return { run };
}