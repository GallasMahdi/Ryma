'use client';
import { useServices } from '@/components/ServiceCatalogProvider';

import { useRef, useState } from 'react';
import {
  IconActivity, IconArrowRight, IconBolt, IconChevronDown, IconClipboardHeart,
  IconClock, IconDroplet, IconFlame, IconHeartbeat, IconRipple, IconSearch,
  IconShieldCheck, IconSnowflake, IconSparkles, IconStethoscope, IconX,
} from '@tabler/icons-react';
import { getLocalizedList, getLocalizedText, type Service, type ServicePole } from '@/data/services';
import { useLanguage } from '@/lib/i18n';
import { playSoftClick } from '@/lib/sound';
import styles from './TreatmentSelector.module.css';

const COPY = {
    es: {
    eyebrow: "La carta de tratamientos", intro: "Un momento para usted. Cuidados elegidos con atención.",
    categories: "Especialidades de tratamiento", kinesitherapie: "Fisioterapia", minceur: "Estética", bilan: "Evaluación",
    kineTitle: "Movimiento. Equilibrio. Recuperación.", kineNote: "Atención especializada para mejorar cómo se mueve y se siente.",
    minceurTitle: "Su cuerpo. Su confianza.", minceurNote: "Descubra nuestros tratamientos corporales y estéticos.",
    bilanTitle: "Un plan a su medida.", bilanNote: "Una evaluación personal para sus objetivos de cuidado corporal.",
    allTitle: "Descubra su próximo tratamiento.", allNote: "Toda nuestra oferta de cuidados, en un solo lugar.",
    treatment: "tratamiento", treatments: "tratamientos", search: "Buscar un tratamiento", clear: "Borrar búsqueda",
    all: "Todos los tratamientos", results: "Resultados de búsqueda", resultsNote: "Tratamientos coincidentes en todas las especialidades.",
    details: "Detalles", hide: "Cerrar detalles", book: "Reservar", bookLabel: "Reservar tratamiento:",
    duration: "Duración", session: "por sesión", expect: "Durante su visita", next: "Elija una fecha",
    noResults: "No se han encontrado tratamientos.", noResultsNote: "Pruebe otro nombre o vuelva a la carta completa.", reset: "Mostrar todos los tratamientos",
    help: "¿Es su primer tratamiento corporal?", helpNote: "Empiece con una evaluación personal.", helpAction: "Descubra su evaluación",
    footer: "Elija su tratamiento. Después, encuentre su horario.", receipt: "Facturas médicas disponibles",
  },
  en: {
    eyebrow: 'The treatment menu', intro: 'A moment for you. Care chosen with intention.',
    categories: 'Treatment specialties', kinesitherapie: 'Physiotherapy', minceur: 'Aesthetics', bilan: 'Assessment',
    kineTitle: 'Movement. Balance. Recovery.', kineNote: 'Specialist care for the way you move and feel.',
    minceurTitle: 'Your body. Your confidence.', minceurNote: 'Explore our body and aesthetic treatments.',
    bilanTitle: 'A plan, made for you.', bilanNote: 'A personal assessment for your body care goals.',
    allTitle: 'Discover your next treatment.', allNote: 'Our complete menu of care, in one place.',
    treatment: 'treatment', treatments: 'treatments', search: 'Find a treatment', clear: 'Clear search',
    all: 'All treatments', results: 'Search results', resultsNote: 'Matching treatments across all specialties.',
    details: 'Details', hide: 'Close details', book: 'Book', bookLabel: 'Book treatment:',
    duration: 'Duration', session: 'per session', expect: 'During your visit', next: 'Choose a date',
    noResults: 'No treatments found.', noResultsNote: 'Try a different name or return to the full menu.', reset: 'Show all treatments',
    help: 'New to body treatments?', helpNote: 'Start with a personal assessment.', helpAction: 'Discover your assessment',
    footer: 'Choose your treatment. Then find your time.', receipt: 'Medical invoices available',
  },
  pt: {
    eyebrow: 'O menu de tratamentos', intro: 'Um momento para si. Um cuidado escolhido com atenção.',
    categories: 'Especialidades', kinesitherapie: 'Fisioterapia', minceur: 'Estética', bilan: 'Avaliação',
    kineTitle: 'Movimento. Equilíbrio. Recuperação.', kineNote: 'Cuidados especializados para se mover e sentir melhor.',
    minceurTitle: 'O seu corpo. A sua confiança.', minceurNote: 'Explore os nossos cuidados corporais e estéticos.',
    bilanTitle: 'Um plano, feito para si.', bilanNote: 'Uma avaliação personalizada para os seus objetivos corporais.',
    allTitle: 'Descubra o seu próximo tratamento.', allNote: 'Todos os nossos cuidados, num só lugar.',
    treatment: 'tratamento', treatments: 'tratamentos', search: 'Encontrar um tratamento', clear: 'Limpar pesquisa',
    all: 'Todos os tratamentos', results: 'Resultados da pesquisa', resultsNote: 'Tratamentos em todas as especialidades.',
    details: 'Detalhes', hide: 'Fechar detalhes', book: 'Agendar', bookLabel: 'Agendar tratamento:',
    duration: 'Duração', session: 'por sessão', expect: 'Durante a sua visita', next: 'Escolher uma data',
    noResults: 'Nenhum tratamento encontrado.', noResultsNote: 'Experimente outro nome ou consulte o menu completo.', reset: 'Ver todos os tratamentos',
    help: 'Primeiro tratamento corporal?', helpNote: 'Comece com uma avaliação personalizada.', helpAction: 'Descobrir a avaliação',
    footer: 'Escolha o cuidado. Encontre o seu momento.', receipt: 'Faturas com cédula profissional',
  },
  fr: {
    eyebrow: 'La carte des soins', intro: 'Un moment pour vous. Un soin choisi avec attention.',
    categories: 'Spécialités', kinesitherapie: 'Kinésithérapie', minceur: 'Esthétique', bilan: 'Bilan',
    kineTitle: 'Mouvement. Équilibre. Récupération.', kineNote: 'Des soins spécialisés pour bouger et vous sentir mieux.',
    minceurTitle: 'Votre corps. Votre confiance.', minceurNote: 'Découvrez nos soins corporels et esthétiques.',
    bilanTitle: 'Un programme, pensé pour vous.', bilanNote: 'Un bilan personnalisé pour vos objectifs corporels.',
    allTitle: 'Découvrez votre prochain soin.', allNote: 'Tous nos soins, réunis dans une même carte.',
    treatment: 'soin', treatments: 'soins', search: 'Trouver un soin', clear: 'Effacer la recherche',
    all: 'Tous les soins', results: 'Résultats de recherche', resultsNote: 'Les soins correspondants, toutes spécialités confondues.',
    details: 'Détails', hide: 'Fermer les détails', book: 'Réserver', bookLabel: 'Réserver le soin :',
    duration: 'Durée', session: 'par séance', expect: 'Lors de votre visite', next: 'Choisir une date',
    noResults: 'Aucun soin trouvé.', noResultsNote: 'Essayez un autre nom ou consultez la carte complète.', reset: 'Voir tous les soins',
    help: 'Votre premier soin du corps ?', helpNote: 'Commencez par un bilan personnalisé.', helpAction: 'Découvrir le bilan',
    footer: 'Choisissez votre soin. Trouvez votre moment.', receipt: 'Factures médicales disponibles',
  },
};

const SPECIALTIES = [
  { pole: 'kinesitherapie', title: 'kineTitle', note: 'kineNote', icon: IconActivity },
  { pole: 'minceur', title: 'minceurTitle', note: 'minceurNote', icon: IconSparkles },
  { pole: 'bilan', title: 'bilanTitle', note: 'bilanNote', icon: IconClipboardHeart },
] as const;

export function BookingServiceIcon({ icon, size = 22 }: { icon: string; size?: number }) {
  const icons: Record<string, typeof IconActivity> = {
    spine: IconActivity, pelvis: IconHeartbeat, hands: IconStethoscope,
    lymph: IconDroplet, electric: IconBolt, wave: IconRipple,
    bubble: IconSparkles, radio: IconFlame, clipboard: IconClipboardHeart,
    laser: IconBolt, compress: IconRipple, snowflake: IconSnowflake, massage: IconStethoscope,
  };
  const Icon = icons[icon] || IconShieldCheck;
  return <Icon size={size} strokeWidth={1.4} aria-hidden="true" />;
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

interface TreatmentSelectorProps {
  selectedService: Service | null;
  onBook: (service: Service) => void;
}

export function TreatmentSelector({ selectedService, onBook }: TreatmentSelectorProps) {
  const SERVICES = useServices();
  const { lang, t } = useLanguage();
  const copy = COPY[lang];
  const [category, setCategory] = useState<ServicePole | 'all'>(selectedService?.pole ?? 'all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const query = normalizeSearch(search);
  const specialty = SPECIALTIES.find(item => item.pole === category);
  const services = SERVICES.filter(service => query
    ? normalizeSearch(`${getLocalizedText(service.name, lang)} ${getLocalizedText(service.shortDesc, lang)} ${copy[service.pole]} ${service.keywords.join(' ')}`).includes(query)
    : category === 'all' || service.pole === category);
  const countLabel = (count: number) => `${count} ${count === 1 ? copy.treatment : copy.treatments}`;
  const formatter = new Intl.NumberFormat(lang === 'es' ? "es-ES" : lang === 'en' ? 'en-IE' : lang === 'pt' ? 'pt-PT' : 'fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
  });
  const changeCategory = (pole: ServicePole | 'all') => {
    setCategory(pole);
    setSearch('');
    setExpanded(null);
    playSoftClick();
  };
  const book = (service: Service) => { playSoftClick(); onBook(service); };

  return (
    <div className={styles.selector}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}><span />{copy.eyebrow}</p>
          <h2>{t.booking.step1Title}</h2>
          <p className={styles.intro}>{copy.intro}</p>
        </div>
        <div className={styles.search}>
          <IconSearch size={18} strokeWidth={1.5} aria-hidden="true" />
          <input ref={searchRef} type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={event => { setSearch(event.target.value); setExpanded(null); }} />
          {search && <button type="button" aria-label={copy.clear} onClick={() => { setSearch(''); searchRef.current?.focus(); }}><IconX size={16} aria-hidden="true" /></button>}
        </div>
      </header>

      <section className={styles.menu} aria-labelledby="treatment-menu-title">
        <div className={styles.specialties} role="group" aria-label={copy.categories}>
          {SPECIALTIES.map(({ pole, icon: Icon }, index) => (
            <button type="button" key={pole} aria-pressed={!query && category === pole} aria-controls="treatment-menu-content" onClick={() => changeCategory(pole)}>
              <span className={styles.specialtyIndex}>0{index + 1}</span>
              <Icon size={22} strokeWidth={1.3} aria-hidden="true" />
              <span className={styles.specialtyLabel}>{copy[pole]}</span>
              <span className={styles.specialtyCount}>{SERVICES.filter(service => service.pole === pole).length}</span>
            </button>
          ))}
        </div>

        <div className={styles.menuContent} id="treatment-menu-content">
          <div className={styles.menuHeading}>
            <div>
              <h3 id="treatment-menu-title">{query ? copy.results : specialty ? copy[specialty.title] : copy.allTitle}</h3>
              <p>{query ? copy.resultsNote : specialty ? copy[specialty.note] : copy.allNote}</p>
            </div>
            <button type="button" className={styles.viewAll} aria-pressed={category === 'all' && !query} onClick={() => changeCategory('all')}>{copy.all}<span>{SERVICES.length}</span></button>
          </div>
          <div className={styles.menuRule}><span role="status" aria-live="polite">{countLabel(services.length)}</span><span /></div>

          {services.length > 0 ? (
            <div className={styles.treatments}>
              {services.map(service => {
                const open = expanded === service.slug;
                const name = getLocalizedText(service.name, lang);
                return (
                  <article key={service.slug} className={styles.treatment} data-expanded={open} data-selected={selectedService?.slug === service.slug}>
                    <div className={styles.treatmentMain}>
                      <span className={styles.treatmentIcon}><BookingServiceIcon icon={service.icon} size={25} /></span>
                      <div className={styles.treatmentInfo}>
                        {(query || category === 'all') && <p className={styles.treatmentCategory}>{copy[service.pole]}</p>}
                        <h4><button type="button" id={`service-${service.slug}`} aria-expanded={open} aria-controls={`details-${service.slug}`} onClick={() => setExpanded(open ? null : service.slug)}>{name}</button></h4>
                        <div className={styles.metadata}>
                          <span aria-label={`${copy.duration}: ${service.duration}`}><IconClock size={13} aria-hidden="true" />{service.duration}</span>
                          <span className={styles.metaDot} aria-hidden="true" />
                          <button type="button" aria-expanded={open} aria-controls={`details-${service.slug}`} aria-label={`${open ? copy.hide : copy.details}: ${name}`} onClick={() => setExpanded(open ? null : service.slug)}>{open ? copy.hide : copy.details}<IconChevronDown size={12} aria-hidden="true" /></button>
                        </div>
                      </div>
                      <div className={styles.treatmentAction}>
                        <span className={styles.price}>{formatter.format(service.price)}</span>
                        <span className={styles.priceNote}>{copy.session}</span>
                        <button type="button" aria-label={`${copy.bookLabel} ${name}`} onClick={() => book(service)}>{copy.book}<IconArrowRight size={14} aria-hidden="true" /></button>
                      </div>
                    </div>
                    <div id={`details-${service.slug}`} className={styles.details} hidden={!open}>
                      <p>{getLocalizedText(service.shortDesc, lang)}</p>
                      <h5>{copy.expect}</h5>
                      <ul>{getLocalizedList(service.sessionFlow, lang).slice(0, 3).map(item => <li key={item}>{item}</li>)}</ul>
                      <button type="button" onClick={() => book(service)}>{copy.next}<IconArrowRight size={16} aria-hidden="true" /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <IconSearch size={28} strokeWidth={1.2} aria-hidden="true" />
              <h4>{copy.noResults}</h4><p>{copy.noResultsNote}</p>
              <button type="button" onClick={() => changeCategory('all')}>{copy.reset}<IconArrowRight size={16} aria-hidden="true" /></button>
            </div>
          )}

          {category !== 'bilan' && !query && SERVICES.some(service => service.pole === 'bilan') && (
            <button type="button" className={styles.assessment} onClick={() => changeCategory('bilan')} aria-label={copy.helpAction}>
              <IconClipboardHeart size={24} strokeWidth={1.3} aria-hidden="true" />
              <span><strong>{copy.help}</strong><span>{copy.helpNote}</span></span>
              <span className={styles.assessmentArrow}><IconArrowRight size={18} aria-hidden="true" /></span>
            </button>
          )}
        </div>
        <footer className={styles.menuFooter}>
          <span>{copy.footer}</span>
          <span><IconShieldCheck size={15} strokeWidth={1.5} aria-hidden="true" />{copy.receipt}</span>
        </footer>
      </section>
    </div>
  );
}
