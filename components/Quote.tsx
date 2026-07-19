"use client";

import { useState } from "react";
import { QUOTES, dailyQuote } from "@/lib/quotes";

export default function Quote() {
  const [quote, setQuote] = useState(dailyQuote);

  function next() {
    let q = quote;
    while (q.text === quote.text) {
      q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    }
    setQuote(q);
  }

  return (
    <blockquote className="quote">
      <p>{quote.text}</p>
      <cite>{quote.author}</cite>
      <button className="quote-refresh" type="button" aria-label="New quote" onClick={next}>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>
    </blockquote>
  );
}
