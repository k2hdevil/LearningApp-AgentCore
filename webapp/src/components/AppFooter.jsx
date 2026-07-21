import './AppFooter.css';
import { useLocale } from '../contexts/LocaleContext.jsx';
import { getTranslations } from '../data/translations.js';

/**
 * AppFooter - 페이지 하단 저작권 및 브랜딩 정보 표시 영역
 * ContentLayout 하단에 배치되는 footer 엘리먼트
 * 로케일에 따라 적절한 언어로 표시한다.
 */
export default function AppFooter() {
  const { locale } = useLocale();
  const t = getTranslations(locale);

  return (
    <footer className="app-footer">
      <p className="app-footer-text">
        {t.footerText}
      </p>
    </footer>
  );
}
