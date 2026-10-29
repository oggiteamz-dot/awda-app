/**
 * layouts.js — the STRUCTURE axis, independent of colour.
 *
 * Twelve layouts in four families, and four surfaces. They compose: 12 × 4 × 8
 * palettes is 384 distinct looks out of 24 rows of data. The previous version
 * bundled one of eight home arrangements INTO each of seventeen palettes, which
 * is exactly why all seventeen looked like the same app — the only structural
 * thing a skin controlled was the home screen, and every other tab was identical
 * in all of them.
 *
 * `recommended` marks the per-module defaults this design actually argues for.
 * The atlas is explicit that each archetype has a best screen, and forcing one
 * structure across five tabs wastes that. So: bento on الرئيسية, register on
 * القضاء, editorial on المعرفة, manuscript on الوصيّة, calligraphy on الاحتضار.
 * The global switcher stays so the alternatives can be compared on a real phone
 * rather than argued about in the abstract.
 *
 * `why` is one Arabic line per layout naming the MODULE it suits and the reason.
 * It exists so a layout is chosen on an argument rather than on a first look, and
 * it is rendered verbatim on the review gallery — the note describes the shape,
 * the why defends it.
 */
export const DEFAULT_LAYOUT = 'bento';
export const DEFAULT_SURFACE = 'glass';

export const LAYOUTS = [
  { key: 'manuscript', ar: 'المخطوط', en: 'Manuscript', family: 'page', best: 'الوصيّة',
    note: 'عمود المتن وهامش ثابت، كصفحة مخطوط.',
    why: 'للوصيّة: الوثيقة تُقرأ سطراً سطراً، والهامش يترك مكاناً للتعليق دون أن يقطع المتن.' },
  { key: 'editorial', ar: 'المجلة', en: 'Editorial', family: 'page', best: 'المعرفة',
    note: 'مساحات واسعة وعناوين كبيرة. الأهدأ، والأطول تمريراً.',
    why: 'للمعرفة: الدرس يحتاج نَفَساً طويلاً، والبياض حول العنوان هو ما يجعل القراءة ممكنة.' },
  { key: 'khat', ar: 'الخط', en: 'Calligraphy', family: 'page', best: 'الاحتضار',
    note: 'بلا بطاقات. الخطّ وحده يحمل الترتيب.',
    why: 'للاحتضار: لا إطار ولا صندوق. في تلك الساعة كلّ حدٍّ مرسوم زيادة.' },

  { key: 'cards', ar: 'البطاقات', en: 'Cards', family: 'grid',
    note: 'المرجع الذي تُقاس عليه البقيّة.',
    why: 'للرئيسيّة: لا شيء أهمّ من شيء. البطاقات متساوية فتُقارَن، ولا تُرتَّب نيابةً عن صاحبها.' },
  { key: 'bento', ar: 'الشبكة', en: 'Bento', family: 'grid', best: 'الرئيسيّة', recommended: true,
    note: 'عمودان، وبطاقة واحدة كبيرة تتصدّر.',
    why: 'للرئيسيّة: بطاقة واحدة تتصدّر لأنّ لليوم عملاً واحداً أوّل، والباقي تحتها.' },
  { key: 'shelves', ar: 'الرفوف', en: 'Shelves', family: 'grid', best: 'المعرفة',
    note: 'صفّ لكلّ مجموعة، يُمرَّر أفقيّاً.',
    why: 'للمعرفة: ما كان مجموعةً يُمرَّر عرضاً. ولا يصلح للقضاء، فإخفاء دَينٍ خارج الشاشة إخفاءٌ له.' },

  { key: 'register', ar: 'السجل', en: 'Register', family: 'dense', best: 'القضاء',
    note: 'أسطر متتابعة وأرقام على الطرف.',
    why: 'للقضاء: سجلٌّ لا بطاقات. الأرقام على عمود واحد فتُجمع بالنظر، والدَّين كلّه ظاهر.' },
  { key: 'path', ar: 'المسار', en: 'Path', family: 'dense', best: 'الصلاة',
    note: 'خطّ رأسيّ وعُقَد مرقّمة. اليوم كمسار، وعليه علامة الآن.',
    why: 'للصلاة: التخطيط الوحيد الذي يقول أين أنت، لا ماذا يوجد. والعُقدة المضيئة هي الآن.' },
  { key: 'ring', ar: 'الحلقة', en: 'Ring', family: 'dense', best: 'القضاء',
    note: 'رقم واحد كبير في الأعلى، والبقيّة أبواب تحته.',
    why: 'للقضاء: رقمٌ واحد في حلقة، وتحته أبواب للعمل. يصلح حين يكون العدد هو الرسالة كلّها.' },

  { key: 'portal', ar: 'المنبر', en: 'Portal', family: 'form', best: 'الوصيّة',
    note: 'أقواس حقيقيّة لا زوايا مستديرة. لا يشبه أيّ تطبيق آخر.',
    why: 'للوصيّة والاحتضار: سجلٌّ احتفاليّ. القوس عمارة لا زخرفة، وهو ما ينقل المقام.' },
  { key: 'sheets', ar: 'الطبقات', en: 'Sheets', family: 'form', best: 'الرئيسيّة',
    note: 'خلفيّة ثابتة ومحتوى يعلوها كطبقة.',
    why: 'للرئيسيّة: عمق لا ترتيب. اللون يبقى أرضاً، والقراءة كلّها على سطحٍ أبيض فوقه.' },
  { key: 'brut', ar: 'الحاد', en: 'Hard Edge', family: 'form', best: 'المعرفة',
    note: 'حدود سميكة وظلال حادّة. الأوضح لمن يصعب عليه النظر.',
    why: 'لمن ضعف بصره، في أيّ وحدة: الحدّ السميك يفصل ما لا يفصله اللون وحده.' },
];

export const SURFACES = [
  { key: 'glass', ar: 'زجاج', en: 'Glass' },
  { key: 'flat', ar: 'مسطّح', en: 'Flat' },
  { key: 'hard', ar: 'ظلّ حادّ', en: 'Hard shadow' },
  { key: 'none', ar: 'بلا حدود', en: 'Borderless' },
];
