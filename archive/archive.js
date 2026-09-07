const data = window.CLURE_ARCHIVE || { articles: [], interviews: [], playlists: [] };
const page = document.querySelector('[data-archive-type]');
const type = page?.dataset.archiveType;
const list = document.querySelector('.archive-content-list');
const filters = document.querySelector('.archive-filters');

const labels = {
  articles: 'статьи',
  interviews: 'интервью',
  playlists: 'плейлисты',
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
  : '';

const text = (tag, className, value) => {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value || '';
  return element;
};

const getPeople = (item, itemType) => itemType === 'interviews'
  ? [item.guest?.name, item.interviewer?.name].filter(Boolean)
  : itemType === 'playlists'
    ? [item.author?.name, item.platform].filter(Boolean)
    : [item.author?.name].filter(Boolean);

const getFilterValues = (items, itemType) => [...new Set(items.flatMap((item) => getPeople(item, itemType)))].sort();

const makeFilter = (label, values, onChange) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'archive-filter';
  const title = text('span', 'archive-filter-label', label);
  const select = document.createElement('select');
  select.className = 'archive-filter-select';
  [['all', 'все'], ...values.map((value) => [value, value])].forEach(([value, optionLabel]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = optionLabel;
    select.append(option);
  });
  select.addEventListener('change', () => onChange(select.value));
  wrapper.append(title, select);
  return wrapper;
};

const makeSort = (onChange) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'archive-filter';
  wrapper.append(text('span', 'archive-filter-label', 'сначала'));
  const select = document.createElement('select');
  select.className = 'archive-filter-select';
  select.innerHTML = '<option value="newest">новые</option><option value="oldest">старые</option>';
  select.addEventListener('change', () => onChange(select.value));
  wrapper.append(select);
  return wrapper;
};

const blockText = (block) => (block.children || []).map((child) => child.text || '').join('');

const articleLink = (item, itemType) => {
  const slug = item.slug?.current;
  if (!slug) return null;
  return itemType === 'articles'
    ? `/articles/${encodeURIComponent(slug)}/`
    : `/interviews/${encodeURIComponent(slug)}/`;
};

const renderItem = (item, itemType) => {
  const element = document.createElement('li');
  element.className = 'archive-content-item';
  if (itemType !== 'playlists') element.append(text('span', 'archive-content-date', formatDate(item.publishedAt)));

  const title = text('h2', 'archive-content-title', item.title || 'Без названия');
  const href = itemType === 'playlists' ? item.url : articleLink(item, itemType);
  if (href) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = title.textContent;
    title.replaceChildren(link);
  }
  element.append(title);

  const metadata = itemType === 'interviews'
    ? [item.guest?.name, item.interviewer?.name].filter(Boolean).join(' · ')
    : itemType === 'playlists'
      ? [item.author?.name, item.platform].filter(Boolean).join(' · ')
      : [item.author?.name, item.category].filter(Boolean).join(' · ');
  if (metadata) element.append(text('p', 'archive-content-meta', metadata));
  if (item.excerpt || item.description) element.append(text('p', 'archive-content-excerpt', item.excerpt || item.description));
  return element;
};

const render = () => {
  const allItems = data[type] || [];
  const selectedPerson = page.dataset.person || 'all';
  const selectedSort = page.dataset.sort || 'newest';
  const items = [...allItems]
    .filter((item) => selectedPerson === 'all' || getPeople(item, type).includes(selectedPerson))
    .sort((a, b) => {
      if (type === 'playlists') return 0;
      const first = new Date(a.publishedAt || 0);
      const second = new Date(b.publishedAt || 0);
      return selectedSort === 'oldest' ? first - second : second - first;
    });
  list.replaceChildren(...items.map((item) => renderItem(item, type)));
  if (!items.length) list.append(text('p', 'archive-content-empty', 'В этом разделе пока нет записей.'));
};

if (page && list && data[type]) {
  if (filters) {
    if (type !== 'interviews') {
      filters.append(makeFilter(type === 'playlists' ? 'платформа / автор' : 'автор', getFilterValues(data[type], type), (value) => {
        page.dataset.person = value;
        render();
      }));
    }
    if (type !== 'playlists') {
      filters.append(makeSort((value) => {
        page.dataset.sort = value;
        render();
      }));
    }
  }
  render();
}
