"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AskQuestion() {
  const [submitted, setSubmitted] = useState(false);
  const [question, setQuestion] = useState("");

  if (submitted) {
    return (
      <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-5 text-[13.5px] leading-relaxed">
        <p className="font-bold text-zinc-950">Thanks — your question is with our tech team.</p>
        <p className="mt-1 text-zinc-600">We answer most questions within one working day and publish answers here for other shoppers.</p>
      </div>
    );
  }

  return (
    <form
      className="rounded-sm border border-zinc-200 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (question.trim()) setSubmitted(true);
      }}
    >
      <h3 className="text-[15px] font-bold text-zinc-950">Ask a question about this product</h3>
      <label htmlFor="qa-input" className="sr-only">Your question</label>
      <textarea
        id="qa-input"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={3}
        required
        placeholder="e.g. Does this come with a UK charger in the box?"
        className="mt-3 w-full rounded-sm border border-zinc-300 p-3 text-[13.5px] placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
      />
      <div className="mt-3">
        <Button type="submit" size="sm">Submit question</Button>
      </div>
    </form>
  );
}
