/**
 * library.js — a section of المعرفة, and one page.
 *
 * A page is a list of blocks: paragraph, heading, Qur'an verse, hadith, note.
 * A verse always renders in the Qur'an face, in its own field, with its
 * reference — and obeys the "show Qur'anic text" switch like every verse in
 * the product. A page's own text is marked data-noedit: it is corrected as a
 * page (with its history), not line by line as interface text.
 */
import { head, card, icon, animateIn, esc } from '../core/ui.js';
import { toAr } from '../core/num.js';
import { setGround } from '../core/theme.js';
import { SECTIONS, sectionByKey, inSection, bySlug } from '../core/pages.js';

const para = (s) => esc(s || '').replace(/\n/g, '<br>');

/** The body of a page, block by block. Shared with the staff preview. */
export function renderBlocks(p, { pid = '' } = {}) {
  return (p.blocks || []).map((b, i) => {
    const at = pid ? `data-pk="${esc(pid)}:${i}"` : '';
    if (b.t === 'h') return `<h3 class="h2" ${at} style="margin-top:22px">${para(b.text)}</h3>`;
    if (b.t === 'verse') return `<div ${at}><div class="verse" style="margin-top:16px">${para(b.text)}${b.ref ? `<span class="verse-ref">${esc(b.ref)}</span>` : ''}</div>
      <div class="verse-hidden-note">آية مخفيّة بحسب إعدادك. يمكنك إظهار النصّ القرآنيّ من حسابك.</div></div>`;
    if (b.t === 'hadith') return `<blockquote class="hadith" ${at}><p class="matn">${para(b.text)}</p>${b.ref ? `<cite class="hint">${esc(b.ref)}</cite>` : ''}</blockquote>`;
    if (b.t === 'note') return `<p class="hint page-note" ${at}>${icon('info', 'ic-sm')} ${para(b.text)}</p>`;
    return `<p class="matn" ${at} style="font-size:16px;margin-top:12px">${para(b.text)}</p>`;
  }).join('');
}

/* ══ one section ═══════════════════════════════════════════════════════════ */
export function section(root, go, k) {
  setGround(null);
  const s = sectionByKey(k) || SECTIONS[0];
  const list = inSection(s.k);
  root.innerHTML = `
  ${head({ kicker: 'المعرفة', title: s.ar, back: true, sub: list.length ? `${toAr(list.length)} ${list.length === 1 ? 'صفحة' : 'صفحات'}` : '' })}
  <div class="wrap lift stack" data-screen="section">
    ${list.length ? card(`<div class="reg">${list.map((p) => `
      <button class="reg-row" data-go="#/page/${encodeURIComponent(p.slug)}">
        <span class="grow" data-noedit><b class="h3" style="display:block">${esc(p.title)}</b>
          ${p.summary ? `<span class="hint">${esc(p.summary)}</span>` : ''}</span>
        ${icon('next', 'ic-sm')}</button>`).join('')}</div>`, 'card-flush')
      : card(`<div class="empty">${icon(s.ic, 'ic')}
          <p class="body" style="margin-bottom:8px">صفحات هذا الباب قيد الكتابة.</p>
          <p class="hint">كلّ صفحة يكتبها عالم، ولا تُنشر إلّا بعد الموافقة عليها.</p></div>`)}
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
}

/* ══ one page ══════════════════════════════════════════════════════════════ */
export function page(root, go, slug) {
  setGround(null);
  const p = bySlug(slug);
  if (!p) {
    root.innerHTML = `${head({ kicker: 'المعرفة', title: 'الصفحة غير متاحة', back: true })}
      <div class="wrap lift">${card('<p class="body">لم تُنشر هذه الصفحة بعد، أو سُحبت للمراجعة.</p>')}</div>`;
    return animateIn(root);
  }
  const s = sectionByKey(p.section);
  root.innerHTML = `
  ${head({ kicker: s ? s.ar : 'المعرفة', title: '', back: true })}
  <div class="wrap lift stack" data-screen="page">
    ${card(`<article data-noedit data-page="${esc(p.id)}">
      <h2 class="display" style="font-size:28px;line-height:1.35" data-pk="${esc(p.id)}:title">${esc(p.title)}</h2>
      ${p.summary ? `<p class="body soft" style="margin-top:8px">${esc(p.summary)}</p>` : ''}
      <div class="rule" style="margin-block:16px"></div>
      ${renderBlocks(p, { pid: p.id })}
    </article>`)}
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
}
