'use client';

import { useState, useEffect } from 'react';

export type FontSize = 'normal' | 'large' | 'xlarge';

export const useFontSize = () => {
  const [fontSize, setFontSizeState] = useState<FontSize>('normal');

  useEffect(() => {
    const saved = localStorage.getItem('font-size') as FontSize;
    if (saved && ['normal', 'large', 'xlarge'].includes(saved)) {
      setFontSizeState(saved);
      if (saved !== 'normal') {
        document.documentElement.setAttribute('data-font', saved);
      }
    }
  }, []);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem('font-size', size);
    if (size === 'normal') {
      document.documentElement.removeAttribute('data-font');
    } else {
      document.documentElement.setAttribute('data-font', size);
    }
  };

  return { fontSize, setFontSize };
};
