import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const html = read('index.html');
const section = (id) => {
  const m = html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`));
  assert.ok(m, `нет секции #${id}`);
  return m[0];
};

// ---- Task 1: инварианты
test('нет запрещённых слов', () => {
  const text = html.replace(/<(style|script)[\s\S]*?<\/\1>/g, '').toLowerCase();
  for (const w of ['обнимаш', 'на руках', 'селфи', 'лучший', 'единственн', '100%']) {
    assert.ok(!text.includes(w), `найдено «${w}»`);
  }
});
test('все img имеют alt, width и height', () => {
  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
    assert.match(tag, /alt="/, tag);
    assert.match(tag, /width=/, tag);
    assert.match(tag, /height=/, tag);
  }
});
test('ссылки на файлы существуют', () => {
  for (const m of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) {
    assert.ok(existsSync(join(root, m[1])), `нет файла ${m[1]}`);
  }
});
test('внешние ссылки открываются безопасно', () => {
  for (const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g) ?? []) {
    assert.match(tag, /rel="noopener"/, tag);
  }
});
test('мета и разметка', () => {
  assert.match(html, /<html lang="ru"/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<title>/);
  assert.match(html, /application\/ld\+json/);
  assert.ok(html.includes('ул. Егорова, 1/1Б'));
  assert.ok(html.includes('+7 988 506-19-99'));
});
test('цена и сеансы', () => {
  for (const s of ['1&nbsp;700', '2&nbsp;100', '2&nbsp;500', '40 минут', '15 человек', 'с 14 лет']) {
    assert.ok(html.includes(s), `нет «${s}»`);
  }
});
test('ключевые ссылки', () => {
  for (const s of ['domcapybar.restoplace.ws', 't.me/dom_capybar_sochi', '230817806698', 'tel:+79885061999']) {
    assert.ok(html.includes(s), `нет «${s}»`);
  }
});

// ---- Task 2: hero, шапка
test('hero: фото, приоритет, одна главная кнопка', () => {
  const hero = html.match(/<section class="hero"[\s\S]*?<\/section>/)[0];
  assert.match(hero, /kids-on-sofa\.jpg/);
  assert.match(hero, /fetchpriority="high"/);
  const actions = hero.match(/<div class="actions">[\s\S]*?<\/div>/)[0];
  assert.equal((actions.match(/class="btn/g) ?? []).length, 1);
  for (const s of ['40 минут', 'до 15 человек', 'с 14 лет']) assert.ok(hero.includes(s), s);
});
test('шапка: зелёный логотип', () => {
  const header = html.match(/<header>[\s\S]*?<\/header>/)[0];
  assert.match(header, /logo-green\.png/);
  assert.match(header, /alt="Дом Капибара"/);
});
test('нижняя панель с ценой', () => {
  assert.match(html.match(/<div class="bar"[\s\S]*?<\/div>/)[0], /от 1&nbsp;700/);
});

// ---- Task 3
test('about: карточки с lazy-фото и шаги визита', () => {
  const s = section('about');
  const imgs = s.match(/<img\b[^>]*>/g) ?? [];
  assert.ok(imgs.length >= 3 && imgs.length <= 6, `img: ${imgs.length}`);
  for (const i of imgs) assert.match(i, /loading="lazy"/);
  for (const w of ['Запись', 'Инструктаж', 'Знакомство', 'Фото']) assert.ok(s.includes(w), w);
});
test('reviews: только ссылки, без цитат', () => {
  const s = section('reviews');
  assert.ok(!s.includes('<blockquote'));
  assert.match(s, /yandex\.ru\/maps\/org\/dom_kapibar\/230817806698\/reviews\//);
});

// ---- Task 4
test('tickets: Restoplace, цель, телефон, Telegram', () => {
  const s = section('tickets');
  assert.match(s, /domcapybar\.restoplace\.ws/);
  assert.match(s, /data-goal="buy_click"/);
  assert.match(s, /tel:\+79885061999/);
  assert.match(s, /t\.me\/dom_capybar_sochi/);
});
test('location: Telegram и Яндекс Карты', () => {
  const s = section('location');
  assert.match(s, /t\.me\/dom_capybar_sochi/);
  assert.match(s, /Открыть в Яндекс Картах/);
});
test('faq: ровно 3 раскрытых вопроса', () => {
  assert.equal((section('faq').match(/<details open/g) ?? []).length, 3);
});
test('подвал: юридические ссылки и Telegram', () => {
  const f = html.match(/<footer class="site">[\s\S]*?<\/footer>/)[0];
  for (const w of ['оферта', 'возврата', 'персональных данных', 'Правила посещения']) {
    assert.ok(f.toLowerCase().includes(w.toLowerCase()), w);
  }
  assert.match(f, /t\.me\/dom_capybar_sochi/);
});

// ---- Task 5
test('анимации под reduced-motion и без layout-свойств', () => {
  assert.match(html, /@media \(prefers-reduced-motion:\s*no-preference\)[\s\S]*kenburns/);
  for (const kf of html.match(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})+[^{}]*\}/g) ?? []) {
    assert.ok(!/(width|height|top|left)\s*:/.test(kf), kf);
  }
});
test('аналитика: goal и необязательный ID Метрики', () => {
  assert.match(html, /function goal\(/);
  assert.match(html, /METRIKA_ID\s*=\s*0/);
  assert.match(html, /property="og:image"/);
});
test('404 существует и использует мем-фото', () => {
  assert.match(read('404.html'), /meme-capybara-sunglasses\.jpg/);
  assert.ok(!html.includes('meme-capybara-sunglasses'));
});
