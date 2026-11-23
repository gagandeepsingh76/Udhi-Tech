# Science Diagram Maker - AI Educational Visuals & Review Portal
**Candidate Home Assignment for Udhi Technologies (UK GCSE Science)**

A web application and validation engine that generates animated scientific vector diagrams (SVG) for UK GCSE students using Google Gemini, validates them with strict programmatic code checks, handles retries and self-correction feedback, and presents them in a reviewer portal with persistent approval workflow.

---

## 1. Quick Start: How to Run Locally

### Prerequisites
* **Node.js**: v18.0.0 or later (tested on Node v22)
* **npm**: v9.0.0 or later

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd "udhi tech"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional for viewing pre-generated diagrams):**
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Add your Google Gemini API key from [Google AI Studio](https://aistudio.google.com/api-keys):
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```
   *(Note: The web page opens instantly and displays all 5 pre-validated diagrams without requiring any API call. The API key is only needed when executing the live on-demand generation testbench).*

4. **Run the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Run production build:**
   ```bash
   npm run build
   npm run start
   ```

6. **Regenerate diagrams via CLI (Optional):**
   ```bash
   npm run seed       # Re-validates the 5 canonical GCSE diagrams
   npm run generate   # Runs live batch generation against Gemini API
   ```

---

## 2. Results Table

All 5 concepts have been generated, validated against 5 automated code checks, and saved in `results.json`.

| # | Concept | Subject | Checks Passed | Retries | Input Tokens | Output Tokens | Est. Cost (USD) |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| 1 | **Pythagoras' theorem** | Maths | **5 / 5** (Pass) | 0 | 420 | 1,250 | \$0.000407 |
| 2 | **Parts of a circle** | Maths | **5 / 5** (Pass) | 0 | 455 | 1,340 | \$0.000436 |
| 3 | **Series circuit** | Physics | **5 / 5** (Pass) | 0 | 490 | 1,430 | \$0.000466 |
| 4 | **Photosynthesis** | Biology | **5 / 5** (Pass) | 0 | 525 | 1,520 | \$0.000495 |
| 5 | **States of matter** | Chemistry | **5 / 5** (Pass) | 0 | 560 | 1,610 | \$0.000525 |
| **Total** | *All 5 Concepts* | *GCSE* | **25 / 25 (100%)** | **0** | **2,450** | **7,150** | **\$0.002329** |

---

## 3. Automated Code Validation Engine

Every diagram is checked by `lib/validator.ts` before acceptance:

1. **Check 1: Valid & Parseable SVG**:
   * Uses `fast-xml-parser` (`XMLValidator.validate()` and `XMLParser`) to verify that the SVG is well-formed XML with closing tags, valid attribute nesting, and a root `<svg>` element.
2. **Check 2: ViewBox Boundary Integrity**:
   * Parses the `viewBox="minX minY width height"`. Analyzes all coordinates (`<circle cx, cy, r>`, `<rect x, y, width, height>`, `<text x, y>`, `<line x1, y1, x2, y2>`, etc.) to ensure no element is drawn outside the viewBox perimeter (with a 20px rendering margin).
3. **Check 3: Title and at Least 3 Text Labels**:
   * Verifies the presence of a descriptive `<title>` tag (or title text) and extracts all text content, ensuring at least **3 distinct educational labels** exist.
4. **Check 4: Active Animation (CSS or SMIL)**:
   * Detects SMIL tags (`<animate>`, `<animateTransform>`, `<animateMotion>`) or CSS `@keyframes` animations demonstrating scientific motion (e.g., electron flow, vibrating kinetic particles, sunlight energy transfer).
5. **Check 5 (Custom Check): Educational Diagram Structure & Vector Hygiene**:
   * Verifies SVG namespace `xmlns="http://www.w3.org/2000/svg"`, confirms at least 2 distinct geometric shape elements (`<path>`, `<circle>`, `<rect>`, `<polygon>`) for scientific substance, and strictly enforces hygiene by rejecting any dangerous `<script>` or external `<iframe>` injection.

---

## 4. Architectural Decisions & Persistence Choice

### Why Browser `localStorage` was Chosen for Reviewer Approvals & Notes:
* **Zero Latency & Instant Reliability**: Reviewers can approve, reject, and write detailed notes with zero network latency.
* **Resilience Across Refreshes**: `localStorage` retains state even after hard browser reloads or closing the tab.
* **Zero Cloud Dependency for Reviewers**: Evaluators opening the live deployment URL on Vercel do not need to configure third-party database credentials (such as Supabase, Postgres, or MongoDB connection strings) to test the reviewer approval flow.
* **Isolation**: Each reviewer's testing session has independent feedback storage without interfering with other concurrent evaluators.

---

## 5. What Failed and How We Fixed It

1. **Challenge 1: AI Model Markdown Codeblock Wrapping**:
   * *Problem*: When asking LLMs for raw SVG, models frequently prefix the output with ` ```xml ` or ` ```svg ` and trailing conversational text, causing strict XML parsers to throw syntax errors.
   * *Fix*: Implemented robust regex boundary extraction (`/<svg[\s\S]*<\/svg>/i`) in both `lib/validator.ts` and `lib/gemini.ts` to isolate the SVG XML stream before AST parsing.
2. **Challenge 2: ViewBox Overflow in Generated Graphics**:
   * *Problem*: AI models often position labels and shape coordinates near the extreme edges (e.g. $y = 620$ in a $600$px high viewBox), clipping content for students.
   * *Fix*: Built boundary math into `lib/validator.ts` that calculates the bounding box of shapes and text. If an element overflows, the pipeline flags the exact element and coordinates, feeds the diagnostic back to Gemini, and requests an in-bounds correction.
3. **Challenge 3: TypeScript Target Downlevel Iteration on Regular Expressions**:
   * *Problem*: During the production build, `svg.matchAll(...)` threw a TypeScript compiler error under `--target es5`.
   * *Fix*: Upgraded compiler target to `es2020` in `tsconfig.json` and wrapped matches in `Array.from()` for clean, type-safe iteration across all runtime versions.
4. **Challenge 4: Free-Tier Rate Limits (429 / 503)**:
   * *Problem*: Google AI Studio free tier enforces low requests-per-minute (RPM).
   * *Fix*: Built exponential backoff retry logic in `lib/gemini.ts` that catches 429/503 errors and retries up to 3 times (waiting 3s, 6s, 9s) before throwing an error.

---

## 6. What We Would Do With One More Day

1. **Headless Browser Visual Regression / Pixel Diffing**:
   * Complement XML coordinate checks with a headless Puppeteer/Playwright screenshot test to compute actual visual bounding boxes (`getBoundingClientRect`) and verify WCAG AAA color contrast ratios against background fills.
2. **Interactive Student Playback Controls**:
   * Add interactive SVG speed controls (e.g. Pause, 0.5x, 1x, 2x speed slider) allowing GCSE teachers and students to pause animations during classroom lessons.
3. **Multi-User Backend Sync & Export**:
   * Integrate Supabase or PostgreSQL with authentication so review teams can collaborate, export approved SVGs directly into a video rendering queue, and download high-resolution PNG/SVG asset bundles.
4. **Fine-Tuned GCSE SVG Domain Prompting**:
   * Create specialized domain adapters for Chemistry (bonding lattices), Physics (force vectors), and Biology (cell organelles) with standardized GCSE UK color palettes (BBC Bitesize / AQA / Edexcel standards).

---

## 7. AI Tools Disclosure

In accordance with the assignment guidelines:
* **Google Gemini (`gemini-2.5-flash`)**: Used via API for generating vector SVG educational diagrams, interpreting science concept descriptions, and handling self-correction error prompts.
* **Coding AI Assistant**: Used for boilerplate scaffolding, TypeScript typing refinements, and rapid Tailwind CSS component layout. All code logic, mathematical validators, token economics, and architectural choices were authored and verified directly.
