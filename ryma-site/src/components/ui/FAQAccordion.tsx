'use client';

import React, { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

export function FAQAccordion({ items, className = '' }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, i) => (
        <div
          key={i}
          className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
            openIndex === i
              ? 'border-[#C49A3C]/40 shadow-[0_4px_16px_rgba(196,154,60,0.1)]'
              : 'border-[#E8E2D8] hover:border-[#C49A3C]/25'
          }`}
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            aria-expanded={openIndex === i}
          >
            <span className="font-medium text-[#1A1412] text-sm md:text-base">{item.q}</span>
            <div
              className={`shrink-0 transition-all duration-200 ${openIndex === i ? 'rotate-180 text-[#C49A3C]' : 'text-[#B8B0A8]'}`}
            >
              <IconChevronDown size={18} />
            </div>
          </button>

          <div className={`grid transition-[grid-template-rows,opacity] duration-200 ${openIndex === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="px-5 pb-5 text-sm text-[#6B6058] leading-relaxed border-t border-[#F0EAE0] pt-4">
                {item.a}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
