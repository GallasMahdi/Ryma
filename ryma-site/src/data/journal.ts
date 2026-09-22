import { BLOG_POSTS, type Lang } from './blog-posts';

export const JOURNAL_POSTS = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
export const JOURNAL_CATEGORIES = ['all', 'Kinésithérapie', 'Minceur', 'Conseils'] as const;
export type JournalCategory = (typeof JOURNAL_CATEGORIES)[number];

export const JOURNAL_COPY = {
  pt: {
    eyebrow: 'Saúde, movimento & bem-estar', title: 'O', emphasis: 'Jornal',
    intro: 'Um espaço para conhecer melhor o seu corpo. Perspetivas sobre fisioterapia, cuidados estéticos e o bem-estar de todos os dias.',
    featured: 'Em destaque', read: 'Ler o artigo', minutes: 'min de leitura',
    explore: 'Explore o jornal', collection: 'Conhecer. Cuidar. Viver melhor.',
    all: 'Todos', search: 'Pesquisar artigos', placeholder: 'O que gostaria de descobrir?', clear: 'Limpar pesquisa',
    sort: 'Ordenar por', newest: 'Mais recentes', shortest: 'Leitura mais breve',
    result: 'artigo', results: 'artigos', empty: 'Ainda não encontrámos esse tema.',
    emptyText: 'Experimente outra palavra ou explore todos os nossos artigos.', reset: 'Ver todos os artigos',
    allArticles: 'Todos os artigos', previewTitle: 'O cuidado começa', previewEmphasis: 'por conhecer.',
    previewIntro: 'Novas perspetivas para cuidar de si, dentro e fora da clínica.',
    back: 'Voltar ao jornal', contents: 'Neste artigo', author: 'Equipa Digital Clínica',
    authorRole: 'Fisioterapia & cuidados estéticos · Lisboa', related: 'Continue a descobrir',
    service: 'Conheça este cuidado', serviceLink: 'Explorar tratamento',
    closing: 'O próximo passo começa consigo.', closingText: 'Conheça os nossos cuidados e encontre espaço para o seu bem-estar.',
    treatments: 'Descobrir os cuidados', book: 'Marcar consulta', table: 'Comparação de tratamentos',
    categories: { 'Kinésithérapie': 'Fisioterapia', Minceur: 'Estética corporal', Conseils: 'Bem-estar' },
  },
  en: {
    eyebrow: 'Health, movement & wellbeing', title: 'The', emphasis: 'Journal',
    intro: 'A space to understand your body better. Perspectives on physiotherapy, aesthetic care and everyday wellbeing.',
    featured: 'In focus', read: 'Read the article', minutes: 'min read',
    explore: 'Explore the journal', collection: 'Understand. Care. Live well.',
    all: 'All topics', search: 'Search articles', placeholder: 'What would you like to discover?', clear: 'Clear search',
    sort: 'Sort by', newest: 'Latest first', shortest: 'Shortest read',
    result: 'article', results: 'articles', empty: 'We haven’t found that topic yet.',
    emptyText: 'Try another word or explore our complete collection.', reset: 'View all articles',
    allArticles: 'All articles', previewTitle: 'Better care begins', previewEmphasis: 'with understanding.',
    previewIntro: 'Fresh perspectives on caring for yourself, in the clinic and beyond.',
    back: 'Back to the journal', contents: 'In this article', author: 'Digital Clínica team',
    authorRole: 'Physiotherapy & aesthetic care · Lisbon', related: 'Keep discovering',
    service: 'Discover this treatment', serviceLink: 'Explore treatment',
    closing: 'Your next chapter starts with you.', closingText: 'Explore our treatments and make room for your wellbeing.',
    treatments: 'Discover our care', book: 'Book an appointment', table: 'Treatment comparison',
    categories: { 'Kinésithérapie': 'Physiotherapy', Minceur: 'Body care', Conseils: 'Wellbeing' },
  },
  fr: {
    eyebrow: 'Santé, mouvement & bien-être', title: 'Le', emphasis: 'Journal',
    intro: 'Un espace pour mieux comprendre votre corps. Des regards sur la kinésithérapie, les soins esthétiques et le bien-être au quotidien.',
    featured: 'À la une', read: 'Lire l’article', minutes: 'min de lecture',
    explore: 'Explorez le journal', collection: 'Comprendre. Prendre soin. Mieux vivre.',
    all: 'Tous les sujets', search: 'Rechercher des articles', placeholder: 'Que souhaitez-vous découvrir ?', clear: 'Effacer la recherche',
    sort: 'Trier par', newest: 'Les plus récents', shortest: 'Lecture la plus courte',
    result: 'article', results: 'articles', empty: 'Nous n’avons pas encore trouvé ce sujet.',
    emptyText: 'Essayez un autre mot ou explorez tous nos articles.', reset: 'Voir tous les articles',
    allArticles: 'Tous les articles', previewTitle: 'Prendre soin commence', previewEmphasis: 'par comprendre.',
    previewIntro: 'De nouvelles perspectives pour prendre soin de vous, à la clinique et au quotidien.',
    back: 'Retour au journal', contents: 'Dans cet article', author: 'Équipe Digital Clínica',
    authorRole: 'Kinésithérapie & soins esthétiques · Lisbonne', related: 'Continuez à découvrir',
    service: 'Découvrez ce soin', serviceLink: 'Explorer le soin',
    closing: 'La prochaine étape commence avec vous.', closingText: 'Découvrez nos soins et faites une place à votre bien-être.',
    treatments: 'Découvrir nos soins', book: 'Prendre rendez-vous', table: 'Comparaison des soins',
    categories: { 'Kinésithérapie': 'Kinésithérapie', Minceur: 'Soins du corps', Conseils: 'Bien-être' },
  },
} as const;

export function journalCategoryLabel(category: string, lang: Lang) {
  const copy = JOURNAL_COPY[lang];
  return category === 'all' ? copy.all : copy.categories[category as keyof typeof copy.categories] ?? category;
}

export function journalDate(date: string, lang: Lang) {
  return new Intl.DateTimeFormat({ pt: 'pt-PT', en: 'en-GB', fr: 'fr-FR' }[lang], {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(date));
}

export function normalizeJournalSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}
