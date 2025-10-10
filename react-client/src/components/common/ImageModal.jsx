import { useEffect } from 'react';

export default function ImageModal({ imageUrl, onClose, onPrev, onNext }) {
  useEffect(() => {
    if (!imageUrl) return;
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (onPrev) onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (onNext) onNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [imageUrl, onPrev, onNext, onClose]);

  if (!imageUrl) return null;

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      {onPrev && <button className="nav-btn prev" onClick={(e) => { e.stopPropagation(); onPrev(); }}>‹</button>}
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <img src={imageUrl} alt="Enlarged content" />
        <button className="close-modal-btn" onClick={onClose}>×</button>
      </div>
      {onNext && <button className="nav-btn next" onClick={(e) => { e.stopPropagation(); onNext(); }}>›</button>}
    </div>
  );
}