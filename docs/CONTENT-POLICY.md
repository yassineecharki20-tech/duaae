# DUAA | دعاء — Content policy

Religious text is the one part of this product where a mistake is not a bug but a harm. This policy
states what may enter the corpus, how it is attributed, and what is mechanically enforced by tests.

---

## 1. Non-negotiables

1. **Nothing is invented.** Every entry is either a Qur'anic verse or a supplication/dhikr recorded
   in a printed, citable collection. There is no paraphrase, no "inspired by", no composite text
   stitched from two sources.
2. **No AI-generated religious text.** No model output is presented as authentic, and no generated
   wording enters the corpus — not even as a placeholder. (This document and the code comments are
   engineering text; the corpus is not.)
3. **Every entry carries at least one source.** `sources: SourceReference[]` is required by the type
   (`src/core/types/domain.ts`) and enforced by a test. An entry without a citation cannot be added.
4. **Attribution is displayed, not hidden.** The reader, the share text and the generated share card
   all print the source line — book, number, narrator and grade where known, or
   `سورة X، الآية Y` for Qur'an.
5. **Grades are recorded as the collections state them.** Where a compiler or well-known grading is
   part of the citation it is stored in `grade`; where the grade is contested or unknown the field is
   left empty rather than filled with a guess.
6. **No fabricated community content.** The Community tab renders an honest empty state until a real
   backend exists. No seeded posts, no fake authors, no lorem-ipsum Arabic.
7. **No fake functionality around content.** Repeat counters, session windows and the daily dua are
   real logic over real fields (`repeat`, `windowStartHour/EndHour`, deterministic daily seed).

---

## 2. Source vocabulary

Citations are produced by the helpers in `src/data/content/authoring.ts` (`Source.*`), so a book name
can never be misspelled or invented ad hoc. Usage across the 147 entries currently in the corpus
(299 citations — an entry may cite several):

| Helper | Collection | Citations |
|---|---|---|
| `Source.hisn(section)` | حصن المسلم (Hisn al-Muslim, Saʿid bin ʿAli bin Wahf al-Qahtani) | 80 |
| `Source.muslim(number, narrator)` | صحيح مسلم | 47 |
| `Source.abuDaoud(number, narrator, grade)` | سنن أبي داود | 38 |
| `Source.quran(surah, ayah)` | القرآن الكريم — grade `متواتر` | 36 |
| `Source.bukhari(number, narrator)` | صحيح البخاري | 33 |
| `Source.tirmidhi(number, narrator, grade)` | سنن الترمذي — default grade `حسن` | 31 |
| `Source.ibnMajah(...)` | سنن ابن ماجه | 11 |
| `Source.hakim(...)` | المستدرك على الصحيحين | 11 |
| `Source.ahmad(...)` | مسند أحمد | 6 |
| `Source.nasaai(...)` | سنن النسائي | 3 |
| `Source.ibnSinni(...)` | عمل اليوم والليلة لابن السني | 1 |
| `Source.ibnHibban(...)` | صحيح ابن حبان | 1 |
| `Source.adabMufrad(...)` | الأدب المفرد للبخاري | 1 |
| `Source.dayAndNight(...)` | عمل اليوم والليلة للنسائي | 0 — defined, not yet cited |
| `Source.tabarani(...)` | المعجم للطبراني | 0 — defined, not yet cited |
| `Source.baihaqi(...)` | السنن الكبرى للبيهقي | 0 — defined, not yet cited |

The three zero-count helpers are the controlled vocabulary for citations that are prepared but not
published yet; they are stated here rather than silently removed so a reviewer can see the difference
between "unused" and "unavailable".

Adding a collection means adding a helper here first — never writing a `book:` string inline in a
content file.

---

## 3. Entry shape

```ts
export interface Dua {
  id: string;            // stable, human-readable, never reused
  categoryId: string;    // must exist in categories.ts
  title?: string;        // short Arabic label (UI only, never part of the religious text)
  text: string;          // the supplication/dhikr/verse — verbatim, with diacritics as authored
  virtue?: string;       // documented merit, itself sourced or omitted
  repeat: number;        // ≥ 1 — drives the azkar counter
  sources: SourceReference[];  // ≥ 1 — book / number / narrator / grade / quran
  keywords: string[];    // search only; never displayed as religious content
  order: number;         // authored reading order inside the category
}
```

`title`, `virtue` and `keywords` are editorial metadata. They may be written by the maintainers; the
`text` and `sources` fields may not.

---

## 4. What the test suite enforces

`tests/content.test.ts` (20 tests) fails the build on any of the following:

* corpus size/version drift (`CONTENT_STATS` vs `ALL_DUAS`), duplicate ids
* empty or non-Arabic `text`
* an entry with **zero sources**
* malformed Qur'anic citations (`surah`/`ayah` must be present together)
* `repeat < 1`
* broken `order` inside a category, a `categoryId` that does not exist, wrong per-category counts
* a search-index entry missing for any dua
* a category set that does not match the product spec
* sessions with an invalid daily window
* the daily-dua pool including heavy-repetition morning/evening items (so "dua of the day" is always
  something a person can reasonably read once)
* determinism: the same day yields the same dua, different days differ, and the same determinism
  holds when served through `ContentService`
* `NOT_FOUND` for an unknown id — the service must not guess or substitute a similar dua

---

## 5. Change control

1. **Bump `CONTENT_VERSION`** (`src/data/content/index.ts`, currently `1.4.0`) for any corpus edit.
   The remote-first content service in the Firebase stage uses it to invalidate caches.
2. One category per file (`duas.rizq.ts`, `azkar.morning.ts`, …). Keep `order` contiguous.
3. `npm run test -- tests/content.test.ts` and `npm run typecheck` must pass before the change is
   reviewable.
4. A second reviewer with knowledge of the cited collection must confirm the wording and the
   reference against a printed copy — this is a human gate, not an automated one.
5. Transliteration/translation are **out of scope** until a language stage is commissioned; the app
   ships Arabic only, and `settings/language.tsx` says so honestly.

---

## 6. Known limits (stated plainly)

* Numbering conventions differ between printings (e.g. Hadith numbers in Sunan Abi Dawud). Where a
  number could not be pinned to a specific printing it is omitted rather than approximated.
* Some entries cite حصن المسلم as the compiled source *and* the underlying collection; when both are
  known both are listed, and the reader shows the full chain.
* Grading is recorded only where a recognized grading is part of the cited source. Absence of a grade
  is not a claim of weakness.
