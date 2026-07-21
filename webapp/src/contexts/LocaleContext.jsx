import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * localStorage에 언어 설정을 저장하는 키
 */
export const LOCALE_STORAGE_KEY = 'agentcore-locale';

/**
 * 지원하는 로케일 목록
 */
export const SUPPORTED_LOCALES = ['ko', 'en'];

/**
 * localStorage에서 로케일 설정을 로드한다.
 * @returns {'ko'|'en'|null}
 */
function loadLocaleFromStorage() {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (SUPPORTED_LOCALES.includes(stored)) {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 브라우저 기본 언어를 확인한다.
 * @returns {'ko'|'en'}
 */
function getBrowserLocale() {
  try {
    const lang = navigator.language || navigator.languages?.[0] || 'ko';
    if (lang.startsWith('ko')) return 'ko';
    return 'en';
  } catch {
    return 'ko';
  }
}

/**
 * 초기 로케일을 결정한다.
 * 우선순위: localStorage → 브라우저 언어 → 기본 Korean
 * @returns {'ko'|'en'}
 */
function getInitialLocale() {
  const stored = loadLocaleFromStorage();
  if (stored) return stored;
  return getBrowserLocale();
}

/**
 * 로케일 설정을 localStorage에 저장한다.
 * @param {string} locale
 */
function saveLocaleToStorage(locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage 저장 불가 시 에러 무시
  }
}

const LocaleContext = createContext(null);

/**
 * LocaleProvider 컴포넌트
 * - 마운트 시 localStorage에서 로케일을 로드한다.
 * - toggleLocale() 함수를 통해 한국어/영어 전환을 제공한다.
 * - setLocale() 함수를 통해 직접 로케일을 설정할 수 있다.
 */
export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(getInitialLocale);

  const setLocale = useCallback((newLocale) => {
    if (SUPPORTED_LOCALES.includes(newLocale)) {
      setLocaleState(newLocale);
      saveLocaleToStorage(newLocale);
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next = prev === 'ko' ? 'en' : 'ko';
      saveLocaleToStorage(next);
      return next;
    });
  }, []);

  const value = {
    locale,
    setLocale,
    toggleLocale,
    isKorean: locale === 'ko',
    isEnglish: locale === 'en',
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * useLocale 커스텀 Hook
 * LocaleContext로부터 locale 상태와 전환 함수를 반환한다.
 * @returns {{ locale: string, setLocale: (locale: string) => void, toggleLocale: () => void, isKorean: boolean, isEnglish: boolean }}
 */
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

// 테스트를 위한 내부 함수 export
export { loadLocaleFromStorage, getBrowserLocale, getInitialLocale, saveLocaleToStorage };
export default LocaleContext;
