import en from './en';
import es from './es';

const dicts = { en, es };

export function t(lang, key) {
  return (dicts[lang] && dicts[lang][key]) || dicts.en[key] || key;
}
