'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IconArrowRight, IconChevronLeft, IconChevronRight, IconSparkles } from '@tabler/icons-react';
import { useLanguage } from '@/lib/i18n';
import { getLocalizedText } from '@/data/services';

// Editorial photo gallery only. Bookable treatments come from the dashboard catalogue.
const PHOTOS = [
  { id: 'cellulite', src: '/results/before_after_cellulite.png', title: {
    es: "Piel y textura", pt: 'Pele & textura', en: 'Skin & texture', fr: 'Peau & texture' } },
  { id: 'contour', src: '/results/before_after_cryolipolyse.png', title: {
    es: "Contorno corporal", pt: 'Contorno corporal', en: 'Body contour', fr: 'Silhouette' } },
  { id: 'abdomen', src: '/results/before_after_postpartum.png', title: {
    es: "Abdomen", pt: 'Abdómen', en: 'Abdomen', fr: 'Abdomen' } },
  { id: 'face', src: '/results/before_after_radiofrequence.png', title: {
    es: "Rostro y firmeza", pt: 'Rosto & firmeza', en: 'Face & firmness', fr: 'Visage & fermeté' } },
  { id: 'legs', src: '/results/before_after_drainage.png', title: {
    es: "Piernas", pt: 'Pernas', en: 'Legs', fr: 'Jambes' } },
] as const;

const COPY = {
    es: {
    eyebrow: "Cuidados en imágenes", title: "Antes y después", before: "Antes", after: "Después",
    intro: "Explore la galería comparativa y descubra un enfoque personalizado para su cuidado.",
    detail: "Cada persona tiene su propio recorrido. Hable con nuestro equipo sobre los cuidados adecuados para sus objetivos.",
    note: "Los resultados varían de una persona a otra. Su plan se define durante una evaluación individual.",
    catalogue: "Explorar tratamientos", contact: "Hablar con el equipo", group: "Elija una comparación",
    previous: "Foto anterior", next: "Foto siguiente", gallery: "Galería de antes y después",
  },
  pt: {
    eyebrow: 'O cuidado em imagens', title: 'Antes e Depois', before: 'Antes', after: 'Depois',
    intro: 'Explore a galeria de comparações e descubra uma abordagem personalizada ao seu cuidado.',
    detail: 'Cada pessoa tem o seu percurso. Fale com a nossa equipa para conhecer os cuidados adequados aos seus objetivos.',
    note: 'Os resultados variam de pessoa para pessoa. O plano de cuidados é definido numa avaliação individual.',
    catalogue: 'Explorar tratamentos', contact: 'Falar com a equipa', group: 'Escolher uma comparação',
    previous: 'Fotografia anterior', next: 'Fotografia seguinte', gallery: 'Galeria antes e depois',
  },
  en: {
    eyebrow: 'Care in pictures', title: 'Before & After', before: 'Before', after: 'After',
    intro: 'Explore the comparison gallery and discover a personal approach to your care.',
    detail: 'Everyone has their own journey. Talk to our team about care suited to your goals.',
    note: 'Results vary from person to person. Your care plan is defined during an individual assessment.',
    catalogue: 'Explore treatments', contact: 'Talk to the team', group: 'Choose a comparison',
    previous: 'Previous photo', next: 'Next photo', gallery: 'Before and after gallery',
  },
  fr: {
    eyebrow: 'Le soin en images', title: 'Avant & Après', before: 'Avant', after: 'Après',
    intro: 'Explorez la galerie de comparaisons et découvrez une approche personnalisée de vos soins.',
    detail: 'Chaque personne a son parcours. Échangez avec notre équipe sur les soins adaptés à vos objectifs.',
    note: 'Les résultats varient selon les personnes. Le programme de soins est défini lors d’une évaluation individuelle.',
    catalogue: 'Découvrir les soins', contact: 'Contacter l’équipe', group: 'Choisir une comparaison',
    previous: 'Photo précédente', next: 'Photo suivante', gallery: 'Galerie avant et après',
  },
};

export function BeforeAfterGallery() {
  const { lang } = useLanguage();
  const [active, setActive] = useState(0);
  const copy = COPY[lang];
  const photo = PHOTOS[active];
  const title = getLocalizedText(photo.title, lang);
  const move = (direction: number) => setActive(index => (index + direction + PHOTOS.length) % PHOTOS.length);

  return (
    <section id="resultats" aria-labelledby="before-after-title" className="relative scroll-mt-24 overflow-hidden bg-[#0F0D0B] py-16 text-white sm:py-20 lg:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #C49A3C 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C49A3C]/35 bg-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#E8C97A] sm:text-xs"><IconSparkles size={14} aria-hidden="true" />{copy.eyebrow}</p>
          <h2 id="before-after-title" className="mb-4 font-serif text-4xl tracking-tight sm:text-5xl">{copy.title}</h2>
          <p className="text-sm leading-relaxed text-[#B8B1A6] sm:text-base">{copy.intro}</p>
        </header>

        <div role="group" aria-label={copy.group} className="mb-8 flex flex-wrap justify-center gap-2 sm:mb-10">
          {PHOTOS.map((item, index) => (
            <button key={item.id} type="button" aria-pressed={active === index} aria-controls="before-after-photo" onClick={() => setActive(index)} className={`min-h-11 rounded-full border px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E8C97A] sm:text-sm ${active === index ? 'border-[#C49A3C] bg-[#C49A3C] text-[#0F0D0B]' : 'border-white/15 bg-white/5 text-[#C6BFB4] hover:border-[#C49A3C]/60 hover:text-white'}`}>
              {getLocalizedText(item.title, lang)}
            </button>
          ))}
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <figure id="before-after-photo" className="min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-[#211D18] shadow-2xl" aria-label={copy.gallery}>
            <div className="grid grid-cols-2 border-b border-white/10 text-center text-[11px] font-semibold uppercase tracking-[.18em]">
              <span className="px-3 py-3 text-[#C6BFB4]">{copy.before}</span>
              <span className="border-l border-white/10 px-3 py-3 text-[#E8C97A]">{copy.after}</span>
            </div>
            {/* Each original asset already contains both photos. Show it whole and unfiltered. */}
            <Image key={photo.id} src={photo.src} alt={`${copy.title} — ${title}`} width={1024} height={1024} sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), 548px" quality={85} className="block h-auto w-full" />
            <figcaption className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
              <span aria-live="polite" aria-atomic="true" className="text-xs text-[#C6BFB4]">{title} <span className="ml-2 tabular-nums text-[#E8C97A]">{active + 1} / {PHOTOS.length}</span></span>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => move(-1)} aria-label={copy.previous} className="flex size-11 items-center justify-center rounded-full border border-white/15 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#E8C97A]"><IconChevronLeft size={18} /></button>
                <button type="button" onClick={() => move(1)} aria-label={copy.next} className="flex size-11 items-center justify-center rounded-full border border-white/15 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#E8C97A]"><IconChevronRight size={18} /></button>
              </div>
            </figcaption>
          </figure>

          <div className="min-w-0 space-y-6">
            <div className="h-px w-12 bg-[#C49A3C]" aria-hidden="true" />
            <h3 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h3>
            <p className="max-w-md text-sm leading-relaxed text-[#C6BFB4] sm:text-base">{copy.detail}</p>
            <p className="max-w-md border-l-2 border-[#C49A3C]/50 pl-4 text-xs leading-relaxed text-[#A8A49C]">{copy.note}</p>
            <div className="flex flex-wrap items-center gap-5 pt-2">
              <Link href="/services" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C49A3C] px-6 py-3 text-sm font-semibold text-[#0F0D0B] transition-colors hover:bg-[#E8C97A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E8C97A]">{copy.catalogue}<IconArrowRight size={17} aria-hidden="true" /></Link>
              <Link href="/contact" className="text-sm text-[#E8C97A] underline-offset-4 hover:underline">{copy.contact}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
