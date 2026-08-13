import type { AIContext, ResumeData } from '../types';
import aiContextJson from './ai-context.json';
import resumeJson from './resume.json';

// TypeScript types a JSON import from its literal contents, not from the schema
// that governs it. That produces two mismatches: enum-valued fields widen to
// `string` (so `maturity` will not satisfy MaturitySchema's union), and optional
// fields that happen to be absent from every current entry disappear from the
// type altogether (so reading `aliases` is a compile error until some entry
// uses it).
//
// The Zod schemas are the real contract, and populateVectorizeIndex validates
// against them at runtime on every populate — which is where a genuine mismatch
// would surface. So the cast is asserted once, here, rather than being repeated
// at each import site where it would be easy to get subtly different.
export const resumeData = resumeJson as unknown as ResumeData;
export const aiContext = aiContextJson as unknown as AIContext;
