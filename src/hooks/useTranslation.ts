import { useMemo } from 'react';
import { t as translate } from '@/i18n';

export const useTranslation = () => {
  const t = useMemo(() => translate, []);
  return { t };
};
