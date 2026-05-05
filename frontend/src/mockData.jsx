export const popularBooks = [
  { id: 1, title: "Танці з кістками", author: "Макс Кідрук", color: "bg-stone-800" },
  { id: 2, title: "Місто", author: "Валер'ян Підмогильний", color: "bg-stone-300" },
  { id: 3, title: "Дюна", author: "Френк Герберт", color: "bg-stone-200" },
  { id: 4, title: "1984", author: "Джордж Орвелл", color: "bg-stone-400" },
  { id: 5, title: "Інститут", author: "Стівен Кінг", color: "bg-stone-700" },
];

export const newReleases = [
  { id: 11, title: "Залізне полум'я", author: "Ребекка Яррос", color: "bg-stone-900" },
  { id: 12, title: "Асистентка лиходія", author: "Ганна Ніколь Мейв", color: "bg-stone-200" },
  { id: 13, title: "Словник війни", author: "Остап Українець", color: "bg-stone-400" },
  { id: 14, title: "Четверте крило", author: "Ребекка Яррос", color: "bg-stone-700" },
];

export const topCategories = [
  { id: 'fiction', title: 'Художня література', winner: 'Танці з кістками', votes: '12,450' },
  { id: 'fantasy', title: 'Фентезі та Фантастика', winner: 'Четверте крило', votes: '18,200' },
  { id: 'nonfiction', title: 'Нон-фікшн', winner: 'Словник війни', votes: '9,120' },
  { id: 'thriller', title: 'Трилери та Детективи', winner: 'Інститут', votes: '14,300' },
];

export const genres = ["Художня література", "Фентезі", "Детективи", "Психологія", "Історія", "Біографії"];

export const myLibrary = [
  {
    id: 'reading', title: 'Читаю зараз',
    books: [
      { id: 101, title: 'Танці з кістками', author: 'Макс Кідрук', color: 'bg-stone-800', progress: 45 },
      { id: 102, title: 'Асистентка лиходія', author: 'Ганна Ніколь', color: 'bg-[#4A5D4E]', progress: 12 }
    ]
  },
  {
    id: 'planned', title: 'В планах',
    books: [
      { id: 201, title: '1984', author: 'Джордж Орвелл', color: 'bg-stone-400' },
      { id: 202, title: 'Інститут', author: 'Стівен Кінг', color: 'bg-[#2A2A2A]' },
      { id: 203, title: 'Залізне полум\'я', author: 'Ребекка Яррос', color: 'bg-[#7A2A2A]' },
    ]
  }
];