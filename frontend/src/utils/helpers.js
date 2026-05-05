export const getAuthorsString = (book) => {
  if (book?.authors?.length > 0) return book.authors.join(', ');
  return book?.author || 'Невідомий автор';
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('uk-UA');
};