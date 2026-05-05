import React, { useState, useEffect } from 'react';
import { Star, AlertTriangle, Heart, Send } from 'lucide-react';
import { booksApi } from '../../api/books.api';

export default function ReviewSection({ bookId, isLoggedIn }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    booksApi.getReviews(bookId).then(data => setReviews(data || []));
  }, [bookId]);

  const handleSubmit = async () => {
    if (!isLoggedIn) return window.dispatchEvent(new Event('auth:expired'));
    if (!rating) return alert('Оберіть оцінку!');
    
    setIsSubmitting(true);
    try {
      await booksApi.addReview(bookId, { rating, comment, has_spoiler: hasSpoiler });
      setRating(0); setComment(''); setHasSpoiler(false);
      const updated = await booksApi.getReviews(bookId);
      setReviews(updated || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (reviewId) => {
    if (!isLoggedIn) return window.dispatchEvent(new Event('auth:expired'));
    try {
      await booksApi.likeReview(reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likes_count: (r.likes_count || 0) + 1 } : r));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Форма відгуку */}
      {isLoggedIn && (
        <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200">
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)}>
                <Star className={`w-8 h-8 transition-colors ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300 hover:text-amber-200'}`} />
              </button>
            ))}
          </div>
          <textarea 
            value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Ваші враження від книги..."
            className="w-full bg-white border border-stone-200 rounded-2xl p-4 outline-none focus:border-[#1A361D] focus:ring-1 focus:ring-[#1A361D] resize-none h-24 mb-4"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={hasSpoiler} onChange={e => setHasSpoiler(e.target.checked)} className="w-4 h-4 accent-[#D97757]" />
              <span className="text-sm font-bold text-stone-500 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-[#D97757]"/> Містить спойлери</span>
            </label>
            <button onClick={handleSubmit} disabled={isSubmitting || !rating} className="bg-[#1A361D] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#2C5234] transition-colors disabled:opacity-50">
              {isSubmitting ? 'Публікація...' : 'Опублікувати'}
            </button>
          </div>
        </div>
      )}

      {/* Список відгуків */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <p className="text-stone-400 text-center py-8 font-medium">Ще немає відгуків. Будьте першим!</p>
        ) : reviews.map(review => (
          <div key={review.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center font-bold text-stone-600">
                  {review.user_name?.[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-stone-900">{review.user_name}</p>
                  <div className="flex gap-0.5">
                    {Array.from({length: 5}).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />)}
                  </div>
                </div>
              </div>
              <span className="text-xs text-stone-400 font-medium">{new Date(review.created_at).toLocaleDateString()}</span>
            </div>
            
            {review.has_spoiler ? (
              <details className="group">
                <summary className="cursor-pointer text-sm font-bold text-[#D97757] bg-orange-50 p-3 rounded-xl flex items-center gap-2 outline-none">
                  <AlertTriangle className="w-4 h-4"/> Увага, спойлер! Натисніть, щоб розкрити
                </summary>
                <p className="mt-4 text-stone-600">{review.review_text}</p>
              </details>
            ) : (
              <p className="text-stone-600 leading-relaxed">{review.review_text}</p>
            )}

            <div className="mt-4 pt-4 border-t border-stone-50 flex gap-4">
              <button onClick={() => handleLike(review.id)} className="flex items-center gap-1.5 text-sm font-bold text-stone-400 hover:text-red-500 transition-colors">
                <Heart className="w-4 h-4" /> {review.likes_count || 0}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}