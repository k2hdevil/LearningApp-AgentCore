import { useLocale } from '../contexts/LocaleContext.jsx';
import { getTranslations } from '../data/translations.js';

/**
 * LanguageToggle - TopNavigation utilities에 배치되는 언어 전환 버튼
 * 현재 로케일의 반대 언어 라벨을 표시하여 전환을 유도한다.
 *
 * @returns {Object} TopNavigation utility 구성 객체
 */
export function useLanguageToggleUtility() {
  const { locale, toggleLocale } = useLocale();
  const t = getTranslations(locale);

  return {
    type: 'button',
    text: t.languageToggleLabel,
    ariaLabel: t.languageToggleLabel,
    onClick: toggleLocale,
  };
}

export default useLanguageToggleUtility;
