const archive = window.CLURE_ARCHIVE || { articles: [], interviews: [] };
const page = document.querySelector('[data-detail-type]');
const type = page?.dataset.detailType;
const pathMatch = window.location.pathname.match(/^\/(articles|interviews)\/([^/]+)\/?$/);
const slug = page?.dataset.slug || pathMatch?.[2] || new URLSearchParams(window.location.search).get('slug');
const item = (archive[type] || []).find((entry) => entry.slug?.current === slug);

const text = (tag, className, value) => {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value || '';
  return element;
};

const normalizeLink = (href) => {
  try {
    const url = new URL(href, window.location.origin);
    if (url.hostname === 'clure.ru' || url.hostname === 'www.clure.ru') {
      const match = url.pathname.match(/^\/(articles|interviews)\/([^/]+)\/?$/);
      if (match) {
        const file = match[1] === 'articles' ? 'article.html' : 'interview.html';
        return `/archive/${match[1]}/${file}?slug=${encodeURIComponent(match[2])}${url.hash}`;
      }
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return href;
  }
  return href;
};

const renderInline = (block) => {
  const fragment = document.createDocumentFragment();
  const definitions = new Map((block.markDefs || []).map((definition) => [definition._key, definition]));

  (block.children || []).forEach((child) => {
    let node = document.createTextNode(child.text || '');
    [...(child.marks || [])].reverse().forEach((mark) => {
      if (mark === 'strong' || mark === 'em' || mark === 'code') {
        const wrapper = document.createElement(mark === 'code' ? 'code' : mark);
        wrapper.append(node);
        node = wrapper;
        return;
      }
      const definition = definitions.get(mark);
      if (definition?._type === 'link' && definition.href) {
        const link = document.createElement('a');
        link.href = normalizeLink(definition.href);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.append(node);
        node = link;
      }
    });
    fragment.append(node);
  });
  return fragment;
};

const imageUrl = (reference) => {
  return reference ? `/archive/assets/${reference}.webp` : '';
};

const renderBody = (body, target) => {
  (body || []).forEach((block) => {
    if (block._type === 'image') {
      const src = imageUrl(block.asset?._ref);
      if (!src) return;
      const image = document.createElement('img');
      image.className = 'archive-rich-image';
      image.src = src;
      image.alt = block.alt || '';
      target.append(image);
      return;
    }
    if (block._type === 'video') return;
    const value = (block.children || []).map((child) => child.text || '').join('');
    if (!value.trim()) return;
    const tag = block.style === 'h2' ? 'h2' : block.style === 'h3' ? 'h3' : block.style === 'blockquote' ? 'blockquote' : 'p';
    const element = document.createElement(tag);
    element.append(renderInline(block));
    target.append(element);
  });
};

if (!page || !item) {
  document.title = 'Материал не найден — clure';
} else {
  const title = document.querySelector('[data-detail-title]');
  const meta = document.querySelector('[data-detail-meta]');
  const excerpt = document.querySelector('[data-detail-excerpt]');
  const body = document.querySelector('[data-detail-body]');
  title.textContent = item.title;
  document.title = `${item.title} — clure`;
  const people = type === 'interviews'
    ? [item.guest?.name, item.interviewer?.name].filter(Boolean).join(' · ')
    : [item.author?.name, item.category].filter(Boolean).join(' · ');
  meta.textContent = [people, item.publishedAt && new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(item.publishedAt))].filter(Boolean).join(' · ');
  if (item.excerpt) excerpt.textContent = item.excerpt;
  else excerpt.remove();
  if (item.mainImage?.asset?._ref) {
    const image = document.createElement('img');
    image.className = 'archive-detail-image';
    image.src = imageUrl(item.mainImage.asset._ref);
    image.alt = item.mainImage.alt || item.title;
    body.before(image);
  }
  renderBody(item.body, body);
  if (item.playlist?.url) {
    const link = document.createElement('a');
    link.className = 'archive-detail-playlist';
    link.href = item.playlist.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `слушать плейлист: ${item.playlist.title || 'открыть'} ↗`;
    body.before(link);
  }
}
