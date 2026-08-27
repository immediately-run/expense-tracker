import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Icon from './Icon';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom sheet on phones, centred modal on wider screens. */
function Sheet({ title, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="grip" aria-hidden="true" />
        <h2>
          {title}
          <button type="button" className="iconbtn close" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </h2>
        {children}
      </div>
    </div>
  );
}

export default Sheet;
