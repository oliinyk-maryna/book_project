export const BOOK_STATUSES = {
  planned: { label: 'В планах', color: 'bg-stone-100' },
  reading: { label: 'Читаю зараз', color: 'bg-blue-100 text-blue-700' },
  read:    { label: 'Прочитано', color: 'bg-green-100 text-green-700' },
  dropped: { label: 'Покинув', color: 'bg-red-100 text-red-700' }
};

export const CLUB_STATUSES = {
  recruiting: { label: 'Набір', color: 'bg-green-100 text-green-700' },
  active:     { label: 'Читаємо', color: 'bg-blue-100 text-blue-700' },
  discussing: { label: 'Обговорення', color: 'bg-amber-100 text-amber-700' },
  closed:     { label: 'Закрито', color: 'bg-stone-100 text-stone-500' },
};