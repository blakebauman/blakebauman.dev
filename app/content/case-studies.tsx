import type { ReactNode } from 'react';

/**
 * The three projects that carry the home page at display weight, and the long
 * form behind each one.
 *
 * Everything here is sourced from the repositories themselves rather than from
 * resume.json, which carries one paragraph per project. Where a claim is an
 * inference rather than something the repo states outright, the copy says so.
 * PRODUCT.md's "specificity over polish" only works if the specific things are
 * actually true.
 */

export interface CaseStudySection {
  heading: string;
  paragraphs?: string[];
  list?: Array<{ term: string; detail: string }>;
  figure?: { node: ReactNode; caption: string };
  code?: { path: string; tag: string; lines: ReactNode };
}

export interface CaseStudy {
  slug: string;
  name: string;
  oneLine: string;
  /** Shown on the home page beside the display-scale name. */
  leadCopy: string;
  meta: Array<{ k: string; v: string }>;
  links: Array<{ label: string; href: string }>;
  sections: CaseStudySection[];
}

/* ---------------------------------------------------------------------------
   Diagram primitives

   Hand-authored inline SVG rather than a chart library: three diagrams do not
   justify a dependency, and these need to inherit the page's own tokens. Each
   diagram carries a <title> and <desc> and is wrapped by the caller in a
   horizontally scrollable figure so it never forces the page to scroll.
--------------------------------------------------------------------------- */

const F_DISPLAY = 'var(--font-display)';
const F_MONO = 'var(--font-mono)';

function Box({
  x,
  y,
  w,
  h,
  label,
  sub,
  fill = 'var(--panel)',
  stroke = 'var(--line)',
  labelFill = 'var(--ink)',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  fill?: string;
  stroke?: string;
  labelFill?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth="1" />
      <text
        x={x + 14}
        y={sub ? y + h / 2 - 4 : y + h / 2 + 5}
        fill={labelFill}
        fontFamily={F_DISPLAY}
        fontSize="14"
        fontWeight="650"
        style={{ fontStretch: '100%' }}
      >
        {label}
      </text>
      {sub && (
        <text x={x + 14} y={y + h / 2 + 14} fill="var(--muted)" fontFamily={F_MONO} fontSize="11">
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="var(--hair-strong)"
        strokeWidth="1"
        markerEnd="url(#bb-arrow)"
      />
      {label && (
        <text
          x={(x1 + x2) / 2}
          y={y1 === y2 ? y1 - 8 : (y1 + y2) / 2 - 5}
          fill="var(--muted)"
          fontFamily={F_MONO}
          fontSize="10.5"
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <marker
        id="bb-arrow"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--hair-strong)" />
      </marker>
    </defs>
  );
}

/* --------------------------------- felix --------------------------------- */

const felixDiagram = (
  <svg viewBox="0 0 880 430" role="img" aria-labelledby="felix-dg-t felix-dg-d">
    <title id="felix-dg-t">Felix request and execution paths</title>
    <desc id="felix-dg-d">
      A client reaches felix-api over one of four surfaces: REST and SSE, an OpenAI-compatible v1
      endpoint, A2A JSON-RPC, and MCP. The API resolves a YAML manifest through the harness package,
      which owns patterns, tools, session strategy, governance and auth. Durable runs are enqueued
      to a Taskiq worker; a separate scheduler enqueues cron tasks. All three processes share
      Postgres with pgvector as the system of record, Valkey as cache and queue transport, and a
      pluggable object store backed by the filesystem, S3 or GCS.
    </desc>
    <Defs />

    <text x="0" y="14" fill="var(--muted)" fontFamily={F_MONO} fontSize="11">
      client
    </text>
    {['REST / SSE', 'OpenAI-compatible /v1', 'A2A JSON-RPC', 'MCP'].map((s, i) => (
      <g key={s}>
        <rect
          x={i * 218}
          y={26}
          width={200}
          height={34}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1"
        />
        <text
          x={i * 218 + 100}
          y={48}
          fill="var(--gold)"
          fontFamily={F_MONO}
          fontSize="11.5"
          textAnchor="middle"
        >
          {s}
        </text>
      </g>
    ))}
    {[0, 1, 2, 3].map(i => (
      <Arrow key={i} x1={i * 218 + 100} y1={60} x2={i * 218 + 100} y2={92} />
    ))}

    <Box x={0} y={94} w={856} h={52} label="felix-api" sub="CPython 3.14 · Granian · FastAPI" />
    <Arrow x1={428} y1={146} x2={428} y2={176} />

    <Box
      x={0}
      y={178}
      w={520}
      h={58}
      label="packages/harness"
      sub="manifests · patterns · tools · session · governance · auth"
      fill="var(--ox)"
      stroke="var(--ox-lift)"
    />
    <Box x={548} y={178} w={148} h={58} label="worker" sub="Taskiq consumer" />
    <Box x={708} y={178} w={148} h={58} label="scheduler" sub="cron enqueue" />
    {/* The scheduler enqueues; the worker consumes. Without it running alongside,
        nothing periodic fires at all. */}
    <Arrow x1={708} y1={207} x2={698} y2={207} />

    <Arrow x1={260} y1={236} x2={260} y2={276} />
    <Arrow x1={622} y1={236} x2={622} y2={276} />

    <Box x={0} y={278} w={276} h={52} label="PostgreSQL" sub="+ pgvector · system of record" />
    <Box x={290} y={278} w={276} h={52} label="Valkey" sub="cache · queue transport" />
    <Box x={580} y={278} w={276} h={52} label="object store" sub="fs | S3 | GCS" />

    <line
      x1="0"
      y1="360"
      x2="856"
      y2="360"
      stroke="var(--hair)"
      strokeWidth="1"
      strokeDasharray="3 4"
    />
    <text x="0" y="382" fill="var(--muted)" fontFamily={F_MONO} fontSize="11">
      every dependency reached through a Protocol, not a vendor SDK
    </text>
    <text x="0" y="402" fill="var(--muted)" fontFamily={F_MONO} fontSize="11">
      so the same code runs on a filesystem-only VM, on AWS, or on GCP
    </text>
  </svg>
);

/* -------------------------------- memoturn -------------------------------- */

const memoturnDiagram = (
  <svg viewBox="0 0 880 452" role="img" aria-labelledby="mt-dg-t mt-dg-d">
    <title id="mt-dg-t">Memoturn ingest pipeline</title>
    <desc id="mt-dg-d">
      SDKs, OpenTelemetry exporters and framework integrations post to the ingest endpoint on the
      Hono API. The API validates, writes the raw event log to blob storage and enqueues to BullMQ,
      then acknowledges with a 207 without waiting for the analytical write. A separate Bun worker
      drains the queue, merges the events into Apache Doris and runs online evaluators and
      retention. PostgreSQL is the transactional record and is written directly by the API,
      bypassing the queue entirely.
    </desc>
    <Defs />

    {/* Ingest path: a single spine down the left. */}
    <Box
      x={60}
      y={0}
      w={340}
      h={52}
      label="SDKs · OTel · LangChain"
      sub="TypeScript · Python · Go"
    />
    <Arrow x1={230} y1={52} x2={230} y2={92} />
    <text x={242} y={78} fill="var(--muted)" fontFamily={F_MONO} fontSize="10.5">
      POST /v1/ingest
    </text>

    <Box
      x={60}
      y={94}
      w={340}
      h={52}
      label="apps/api"
      sub="Hono on Bun · validate"
      fill="var(--ox)"
      stroke="var(--ox-lift)"
    />

    {/* The early acknowledgement. This is the whole argument of the design. */}
    <Arrow x1={400} y1={120} x2={498} y2={120} />
    <rect x={500} y={98} width={380} height={44} fill="none" stroke="var(--gold)" strokeWidth="1" />
    <text x={514} y={116} fill="var(--gold)" fontFamily={F_MONO} fontSize="11.5">
      207 ack, returned here
    </text>
    <text x={514} y={132} fill="var(--muted)" fontFamily={F_MONO} fontSize="10.5">
      before the analytical write, not after
    </text>

    <Arrow x1={230} y1={146} x2={230} y2={186} />
    <Box x={60} y={188} w={340} h={52} label="blob" sub="raw replayable event log" />

    <Arrow x1={230} y1={240} x2={230} y2={280} />
    <Box x={60} y={282} w={340} h={52} label="BullMQ" sub="on Valkey" />

    {/* Async half: the worker drains the queue and owns the analytical write. */}
    <Arrow x1={400} y1={308} x2={498} y2={308} />
    <Box
      x={500}
      y={282}
      w={380}
      h={52}
      label="apps/worker"
      sub="merge · online evals · retention"
    />
    <Arrow x1={690} y1={334} x2={690} y2={374} />
    <Box x={500} y={376} w={380} h={52} label="Apache Doris" sub="traces · observations · scores" />

    {/* PostgreSQL is written straight from the API. Routed down the margin so it
        cannot be misread as hanging off the queue. */}
    <path
      d="M 60 134 L 28 134 L 28 402 L 56 402"
      fill="none"
      stroke="var(--hair-strong)"
      strokeWidth="1"
      markerEnd="url(#bb-arrow)"
    />
    <Box
      x={60}
      y={376}
      w={340}
      h={52}
      label="PostgreSQL"
      sub="Prisma 7 · projects · prompts · keys"
    />
  </svg>
);

/* ---------------------------------- fold ---------------------------------- */

const FOLD_STAGES: Array<[string, string]> = [
  ['host validation', 'DNS-rebinding protection: Host and Origin allowlist'],
  ['authenticate', 'Bearer → issuer allowlist → JWKS → audience → Principal'],
  ['rate limit', 'global → tenant → per-principal windows → 429 + Retry-After'],
  ['route', 'federated fan-out for lists, namespaced routing otherwise'],
  ['visibility', 'tenant upstream subset, so a fan-out never reaches what it excludes'],
  ['authorize', 'deny-by-default policy, per invocation'],
  ['per-upstream guards', 'rate limit · circuit breaker · timeout · budgets'],
  ['proxy', 'credentials attached, held SDK session per upstream'],
  ['egress', 'per-principal list filtering, namespace rewriting'],
];

const foldDiagram = (
  <svg viewBox="0 0 880 610" role="img" aria-labelledby="fold-dg-t fold-dg-d">
    <title id="fold-dg-t">fold request pipeline</title>
    <desc id="fold-dg-d">
      A POST to the MCP endpoint passes through nine ordered stages: host validation,
      authentication, rate limiting, routing, visibility, authorization, per-upstream guards,
      proxying and egress filtering. Every request leaves through a single audit stage, including
      the ones that were denied, so there is one exit door rather than one per failure branch.
    </desc>
    <Defs />

    <rect x="0" y="0" width="240" height="34" fill="none" stroke="var(--gold)" strokeWidth="1" />
    <text x="16" y="22" fill="var(--gold)" fontFamily={F_MONO} fontSize="12">
      POST /mcp
    </text>

    <line x1="20" y1="34" x2="20" y2="546" stroke="var(--line)" strokeWidth="1" />

    {FOLD_STAGES.map(([name, detail], i) => {
      const y = 56 + i * 52;
      return (
        <g key={name}>
          <rect x="14" y={y + 6} width="13" height="13" fill="var(--ox-lift)" />
          <text
            x="46"
            y={y + 17}
            fill="var(--ink)"
            fontFamily={F_DISPLAY}
            fontSize="15"
            fontWeight="650"
            style={{ fontStretch: '100%' }}
          >
            {name}
          </text>
          <text x="46" y={y + 36} fill="var(--muted)" fontFamily={F_MONO} fontSize="11.5">
            {detail}
          </text>
        </g>
      );
    })}

    <rect
      x="0"
      y="548"
      width="880"
      height="46"
      fill="var(--ox)"
      stroke="var(--ox-lift)"
      strokeWidth="1"
    />
    <rect x="14" y="564" width="13" height="13" fill="var(--gold)" />
    <text
      x="46"
      y={576}
      fill="var(--ink)"
      fontFamily={F_DISPLAY}
      fontSize="15"
      fontWeight="650"
      style={{ fontStretch: '100%' }}
    >
      audit
    </text>
    <text x="110" y={576} fill="var(--muted)" fontFamily={F_MONO} fontSize="11.5">
      one event per request, including denials: a single exit door
    </text>
  </svg>
);

/* ------------------------------- case studies ------------------------------ */

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'felix',
    name: 'felix',
    oneLine:
      'A self-hostable agents harness. Agents are YAML, not code, and the runtime they compile into is governed by default.',
    leadCopy: 'A self-hostable agents harness in Python. Agents are YAML, not code.',
    meta: [
      { k: 'Year', v: '2026' },
      { k: 'Language', v: 'Python 3.14' },
      { k: 'Licence', v: 'Apache-2.0' },
      { k: 'Release', v: 'v0.2.0' },
      { k: 'Status', v: 'Early' },
    ],
    links: [
      { label: 'github.com/felix-run/felix', href: 'https://github.com/felix-run/felix' },
      { label: 'docs.felix.run', href: 'https://docs.felix.run/' },
    ],
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          'An agent is authored as a felix/v1 YAML manifest and compiled into a running, governed agent: durable fibers, memory, skills, evaluation, approvals and sandboxes, all declared rather than wired. Changing what an agent does is a config change.',
          'The same agent is served over four surfaces at once. A REST and SSE endpoint, an OpenAI-compatible /v1 where the manifest name is the model id, A2A JSON-RPC for agent-to-agent calls, and MCP. A client that already speaks any one of those needs no adapter.',
          'It is the third version of this idea. The first ran on AWS Bedrock and LangGraph, the second was TypeScript on Cloudflare Workers with an agentic commerce layer on top. This one dropped both the edge runtime and the commerce layer in exchange for running anywhere the operator controls.',
        ],
      },
      {
        heading: 'Architecture',
        figure: {
          node: felixDiagram,
          caption:
            'Three processes share one datastore triple. The scheduler is separate from the worker on purpose: without it running alongside, nothing periodic fires at all, which is the kind of failure that looks like a bug in the agent rather than a missing process.',
        },
      },
      {
        heading: 'A manifest',
        code: {
          path: 'manifests/governed.yaml',
          tag: 'felix/v1',
          lines: (
            <>
              <span className="c-key">apiVersion</span>: felix/v1{'\n'}
              <span className="c-key">kind</span>: Agent{'\n'}
              <span className="c-key">metadata</span>:{'\n'}
              {'  '}
              <span className="c-key">name</span>: governed{'\n'}
              <span className="c-key">spec</span>:{'\n'}
              {'  '}
              <span className="c-key">model</span>:{'\n'}
              {'    '}
              <span className="c-key">id</span>: claude-sonnet{'\n'}
              {'    '}
              <span className="c-key">thinking_budget</span>: 4096{'\n'}
              {'  '}
              <span className="c-key">session</span>:{'\n'}
              {'    '}
              <span className="c-key">strategy</span>: compacting{' '}
              <span className="c-cmt"># or windowed:N, semantic:N, full_replay</span>
              {'\n'}
              {'  '}
              <span className="c-key">execution</span>:{'\n'}
              {'    '}
              <span className="c-key">mode</span>: durable{' '}
              <span className="c-cmt"># 202 + resume_token; Temporal optional</span>
              {'\n'}
              {'  '}
              <span className="c-key">memory</span>:{'\n'}
              {'    '}
              <span className="c-key">capture</span>: true{'\n'}
              {'  '}
              <span className="c-key">mcp_servers</span>:{' '}
              <span className="c-cmt"># bound in as server__tool</span>
              {'\n'}
              {'    '}- <span className="c-key">id</span>: search{'\n'}
              {'      '}
              <span className="c-key">url</span>:{' '}
              <span className="c-str">https://mcp.internal/mcp</span>
            </>
          ),
        },
      },
      {
        heading: 'The parts that were actually hard',
        list: [
          {
            term: 'A run that dies mid-tool',
            detail:
              'leaves a tool call with no result, and nothing outside the tool can tell whether the effect landed. The call is closed out with an interrupted result before the thread resumes, because a provider rejects the whole transcript over one unanswered call. Tools declare whether they are safe to re-run and the default is that they are not: re-running a search costs latency, re-running a payment charges twice.',
          },
          {
            term: 'Extended thinking is stateful once tools are involved.',
            detail:
              'The provider signs each thinking block, and a later turn replaying a tool call has to replay the signed reasoning that produced it. Blocks are captured off the response and replayed ahead of the tool_use blocks. A block whose signature was not captured is dropped rather than sent, because an unverifiable signature rejects the entire turn.',
          },
          {
            term: 'Side requests poison the prompt cache.',
            detail:
              'Compaction, memory extraction, inbound screening and branch summarisation each carry a completely different prefix. Sharing the conversation cache identity would churn the cached prefix the next real turn would have hit, and write an entry nothing ever reads. They opt out.',
          },
          {
            term: 'An unknown model id has to fail in two directions at once.',
            detail:
              'The request shape assumes the current generation, because sending a parameter a model has removed is a hard 400 while omitting an optional one is not. The context window stays conservative, because over-advertising a window invites a request the model will reject.',
          },
          {
            term: 'A dropped stream is only partly recoverable, and the docs say so.',
            detail:
              'Structural SSE frames carry an id cursor, so a reconnect can replay what was missed and tail the thread. Token-level frames deliberately do not, which per the SSE spec leaves the client on the last structural id. The run itself is still torn down on disconnect: what comes back is the thread, not the abandoned turn.',
          },
        ],
      },
      {
        heading: 'Where it actually is',
        paragraphs: [
          'Released Apache-2.0 at v0.2.0 in August 2026, with CI, a Helm chart, deploy notes for AWS and GCP, and a docs site. Around 290 Python modules and 97 test files.',
          'It is not battle-tested and this page will not claim it is. The TypeScript version is the one that ran longest. What this version has is a smaller dependency surface and no cloud it cannot leave.',
        ],
      },
    ],
  },

  {
    slug: 'memoturn',
    name: 'memoturn',
    oneLine:
      'An open-source AI engineering platform: tracing, evals, prompts and cost analytics, with the transactional and analytical stores kept apart on purpose.',
    leadCopy: 'LLM observability and evals, OpenTelemetry-native and self-hostable.',
    meta: [
      { k: 'Year', v: '2026' },
      { k: 'Language', v: 'TypeScript' },
      { k: 'Licence', v: 'Apache-2.0' },
      { k: 'Release', v: 'v0.5.0' },
      { k: 'Status', v: 'Live' },
    ],
    links: [
      { label: 'github.com/memoturn/memoturn', href: 'https://github.com/memoturn/memoturn' },
      { label: 'memoturn.com', href: 'https://memoturn.com/' },
      { label: 'docs.memoturn.com', href: 'https://docs.memoturn.com/' },
    ],
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          'The layer that answers whether an LLM application is working. Traces, spans, generations and scores over OpenTelemetry with GenAI semantic conventions, so instrumentation is not proprietary. Cost, token and latency metrics at p50 and p95, aggregated by day and by model.',
          'Evaluation runs three ways rather than one: offline against datasets and experiments, online against sampled production traces through the worker, and human through review queues. All three write scores into the same store, and the score shows on the trace it came from.',
          'The case for it came from tracing adventure-agent (a LangGraph system with seventeen-plus specialised agents under an orchestrator) and finding that the interesting failures were invisible without it.',
        ],
      },
      {
        heading: 'Architecture',
        figure: {
          node: memoturnDiagram,
          caption:
            'Two databases, deliberately. PostgreSQL holds the things that need transactions: projects, API keys, prompts, datasets, evaluators. Apache Doris holds the high-volume traces, observations and scores, where the query shape is analytical and the write rate is the problem. The gold box is the whole argument: the caller is answered before anything analytical happens.',
        },
      },
      {
        heading: 'The ingest contract',
        code: {
          path: 'sdks/js · tracing a generation',
          tag: 'TypeScript',
          lines: (
            <>
              <span className="c-key">import</span> {'{'} Memoturn, wrapOpenAI {'}'}{' '}
              <span className="c-key">from</span>{' '}
              <span className="c-str">&quot;@memoturn/sdk&quot;</span>;{'\n\n'}
              <span className="c-key">const</span> mt = <span className="c-key">new</span>{' '}
              Memoturn();{'\n'}
              <span className="c-key">const</span> trace = mt.trace({'{'} name:{' '}
              <span className="c-str">&quot;chat&quot;</span>, userId:{' '}
              <span className="c-str">&quot;u1&quot;</span> {'}'});{'\n\n'}
              trace{'\n'}
              {'  '}.generation({'{'} name: <span className="c-str">&quot;answer&quot;</span>,
              model: <span className="c-str">&quot;claude-sonnet-4-6&quot;</span>, input: messages{' '}
              {'}'}){'\n'}
              {'  '}.end({'{'} output, usage {'}'});{'\n\n'}
              <span className="c-key">await</span> mt.shutdown();{' '}
              <span className="c-cmt"># flushes before the process exits</span>
            </>
          ),
        },
      },
      {
        heading: 'The decisions worth defending',
        list: [
          {
            term: 'The ack is early and that is the point.',
            detail:
              'The API validates, writes the raw event log to blob, enqueues, and returns 207 without waiting for the analytical write. An observability tool that rejects traffic when its own warehouse is slow has inverted its job: a Doris stall should cost freshness, not the caller’s data.',
          },
          {
            term: 'The raw log is written before the queue.',
            detail:
              'Blob holds a replayable record of what actually arrived, so a bad merge is recoverable by replay rather than by asking customers to re-send telemetry they no longer have.',
          },
          {
            term: 'PII masking happens at ingest, not at read.',
            detail:
              'Masking on the way out means the unmasked value was already stored, which is the wrong side of the boundary for anything a compliance reviewer will ask about.',
          },
          {
            term: 'Prompts are versioned with deployment channels.',
            detail:
              'Production, latest, or a custom channel, resolved by the SDK at call time. Prompt changes stop being code deploys, which is what makes online evaluation of a prompt change meaningful at all.',
          },
        ],
      },
      {
        heading: 'Surface',
        paragraphs: [
          'SDKs in TypeScript, Python and Go. An MCP server exposing prompts, datasets and review queues to agent IDEs. Better Auth with organisations, projects, RBAC and SSO over OIDC and SAML. Per-project rate limiting, audit logs, retention policy and scheduled NDJSON exports.',
          'Apache-2.0, at v0.5.0, with a live demo and published packages on npm and PyPI.',
        ],
      },
    ],
  },

  {
    slug: 'fold',
    name: 'fold',
    oneLine:
      'One governed endpoint between every MCP client and every MCP server. Forty out of forty on the official conformance suite, on every merge.',
    leadCopy: 'The enterprise MCP gateway in Go. Federation, policy, audit.',
    meta: [
      { k: 'Year', v: '2026' },
      { k: 'Language', v: 'Go' },
      { k: 'Release', v: 'v1.14.0' },
      { k: 'Conformance', v: '40/40' },
      { k: 'Image', v: '~22 MB' },
    ],
    links: [
      { label: 'github.com/fold-run/fold', href: 'https://github.com/fold-run/fold' },
      { label: 'pkg.go.dev', href: 'https://pkg.go.dev/github.com/fold-run/fold' },
    ],
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          'A gateway that sits in front of any number of upstream MCP servers, in any language, on any SDK, from any team or vendor, and presents them as one virtual server with namespaced tools. Nobody rewrites anything to get behind it.',
          'It is built on the official MCP Go SDK, so the wire protocol is the SDK’s own implementation on both the client-facing and upstream-facing sides rather than a reimplementation that drifts.',
          'The conformance claim is checkable rather than asserted: the official suite runs against fold fronting the reference everything-server on every merge, and a weekly job re-runs it against the latest unpinned SDK and opens a tracking issue the moment anything drifts.',
        ],
      },
      {
        heading: 'The request pipeline',
        figure: {
          node: foldDiagram,
          caption:
            'Visibility sits before authorization, not after: a tenant’s upstream subset is resolved first so a federated fan-out never reaches a server that tenant cannot see. Filtering the results afterwards would have already made the call.',
        },
      },
      {
        heading: 'A federated configuration',
        code: {
          path: 'fold.config.json',
          tag: 'JSON',
          lines: (
            <>
              {'{'}
              {'\n'}
              {'  '}
              <span className="c-key">&quot;upstreams&quot;</span>: [{'\n'}
              {'    '}
              {'{'}
              {'\n'}
              {'      '}
              <span className="c-key">&quot;id&quot;</span>:{' '}
              <span className="c-str">&quot;github-tools&quot;</span>,{'\n'}
              {'      '}
              <span className="c-key">&quot;url&quot;</span>:{' '}
              <span className="c-str">&quot;https://mcp.platform.acme.com/mcp&quot;</span>,{'\n'}
              {'      '}
              <span className="c-key">&quot;namespace&quot;</span>:{' '}
              <span className="c-str">&quot;gh&quot;</span>,{'\n'}
              {'      '}
              <span className="c-key">&quot;owner&quot;</span>: {'{'}{' '}
              <span className="c-key">&quot;org&quot;</span>:{' '}
              <span className="c-str">&quot;acme-platform&quot;</span>,{' '}
              <span className="c-key">&quot;team&quot;</span>:{' '}
              <span className="c-str">&quot;devex&quot;</span> {'}'}
              {'\n'}
              {'    '}
              {'}'},{'\n'}
              {'    '}
              {'{'}
              {'\n'}
              {'      '}
              <span className="c-key">&quot;id&quot;</span>:{' '}
              <span className="c-str">&quot;ml-search&quot;</span>,{'\n'}
              {'      '}
              <span className="c-key">&quot;url&quot;</span>:{' '}
              <span className="c-str">&quot;https://mcp.ml.acquired-co.com/mcp&quot;</span>,{'\n'}
              {'      '}
              <span className="c-key">&quot;namespace&quot;</span>:{' '}
              <span className="c-str">&quot;search&quot;</span>,{'\n'}
              {'      '}
              <span className="c-key">&quot;rateLimit&quot;</span>: {'{'}{' '}
              <span className="c-key">&quot;requestsPerMinute&quot;</span>: 600 {'}'},{'\n'}
              {'      '}
              <span className="c-key">&quot;circuitBreaker&quot;</span>: {'{'}{' '}
              <span className="c-key">&quot;failureThreshold&quot;</span>: 5,{' '}
              <span className="c-key">&quot;halfOpenAfterMs&quot;</span>: 30000 {'}'}
              {'\n'}
              {'    '}
              {'}'}
              {'\n'}
              {'  '}],{'\n'}
              {'  '}
              <span className="c-key">&quot;server&quot;</span>: {'{'}{' '}
              <span className="c-key">&quot;rateLimit&quot;</span>: {'{'}{' '}
              <span className="c-key">&quot;requestsPerMinute&quot;</span>: 6000 {'}'} {'}'}
              {'\n'}
              {'}'}
            </>
          ),
        },
      },
      {
        heading: 'The problems federation actually creates',
        list: [
          {
            term: 'Two teams building from the same template collide.',
            detail:
              'MCP Apps points a tool at an interface through a ui:// resource URI that only has to be unique within one server, and the published starter templates ship with no server segment. Federate two of them and a host rendering one team’s tool could get another team’s app, depending on what some other client had done first. fold mints those URIs per namespace. It is the one documented exception to never rewriting a URI, and it is narrow on purpose.',
          },
          {
            term: 'Task ids are opaque and clients persist them.',
            detail:
              'So fold never rewrites them and remembers ownership instead. A task-scoped call from a different principal answers the same error as an unknown id, with no existence leak and no probe. The ownership index is an authorization record rather than a routing hint, which is why it lives in shared state: a caller must not reach another principal’s task by landing on an instance that did not serve the mint.',
          },
          {
            term: 'A rejected config reload must not take anything down.',
            detail:
              'The upstream set and the policy engine swap atomically, in-flight requests finish against the snapshot they started on, and unchanged upstreams keep their live sessions. Sections that cannot hot-swap fail the reload loudly and keep the running configuration.',
          },
          {
            term: 'A capability profile is computed, never trusted.',
            detail:
              'Root sessions and list-cache entries are keyed by a normalised profile derived from the extension identifiers fold implements, not from the client’s raw map, so a caller inventing extension ids cannot mint sessions or cache entries.',
          },
          {
            term: 'Degradation is explicit rather than silent.',
            detail:
              'A fan-out with a dead upstream returns what it has and names the failures in _meta. A circuit breaker short-circuits an unhealthy upstream. Replicated upstreams round-robin per session and eject a dead endpoint on an active health check before a client request pays for the discovery.',
          },
        ],
      },
      {
        heading: 'Operationally',
        paragraphs: [
          'A distroless container around 22 MB, prebuilt binaries for linux and darwin on both architectures, or one call to embed it in an existing Go service. Set a Redis URL and cache, rate-limit, circuit-breaker and task-ownership state are shared, so a fleet of gateways behaves as one.',
          'One JSON document, validated on startup, with a JSON Schema shipped for editor completion and CI linting.',
        ],
      },
    ],
  },
];

export const LEAD_SLUGS = CASE_STUDIES.map(c => c.slug);

const BY_SLUG = new Map(CASE_STUDIES.map(c => [c.slug, c]));

export function caseStudyFor(slug: string): CaseStudy | undefined {
  return BY_SLUG.get(slug);
}

export function leadCopyFor(slug: string): string {
  return BY_SLUG.get(slug)?.leadCopy ?? '';
}
