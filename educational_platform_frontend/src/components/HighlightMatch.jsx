import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
export function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** Highlights the first case-insensitive occurrence of `query` in `text`. */
export function HighlightMatch({ text, query }) {
    const q = query.trim();
    if (!q || !text)
        return _jsx(_Fragment, { children: text });
    const parts = String(text).split(new RegExp(`(${escapeRegExp(q)})`, 'i'));
    const qLower = q.toLowerCase();
    return (_jsx(_Fragment, { children: parts.map((part, i) => part.toLowerCase() === qLower ? (_jsx("mark", { className: "rounded bg-amber-100/90 px-0.5 font-medium text-slate-900", children: part }, i)) : (_jsx("span", { children: part }, i))) }));
}
