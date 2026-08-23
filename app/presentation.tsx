import katex from "katex";
import type { Visualization } from "./question-bank";

export function MathText({ children }: { children: string }) {
  const parts = children.split(
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$]+?\$|\\\([\s\S]+?\\\))/g,
  );

  return (
    <>
      {parts.map((part, index) => {
        const isDisplay =
          (part.startsWith("$$") && part.endsWith("$$")) ||
          (part.startsWith("\\[") && part.endsWith("\\]"));
        const isInline =
          (part.startsWith("$") && part.endsWith("$") && !isDisplay) ||
          (part.startsWith("\\(") && part.endsWith("\\)"));
        if (!isDisplay && !isInline) return <span key={index}>{part}</span>;

        const expression = part.startsWith("\\")
          ? part.slice(2, -2)
          : isDisplay
            ? part.slice(2, -2)
            : part.slice(1, -1);
        return (
          <span
            key={index}
            className={isDisplay ? "math-display" : "math-inline"}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(expression, {
                throwOnError: false,
                displayMode: isDisplay,
                strict: "ignore",
              }),
            }}
          />
        );
      })}
    </>
  );
}

function labelFor(key: string) {
  const labels: Record<string, string> = {
    startverdi: "Startverdi",
    enhet: "Enhet",
    endring_1_prosent: "Endring 1 (%)",
    endring_2_prosent: "Endring 2 (%)",
    mål: "Mål",
    modell: "Modell",
    terskel: "Terskel",
    x_enhet: "Enhet for x",
    y_enhet: "Enhet for y",
    x_navn: "x beskriver",
    y_navn: "y beskriver",
    pris_enhet: "Prisenhet",
    fast_tid: "Fast tid",
    standardavvik_type: "Standardavvik",
    opprinnelige_data: "Opprinnelige data",
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

function formatValue(value: unknown): string {
  if (typeof value === "number") return value.toLocaleString("nb-NO");
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${labelFor(key)}: ${formatValue(item)}`)
      .join(" · ");
  }
  return String(value ?? "");
}

export function DataPanel({ data }: { data?: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) return null;
  const entries = Object.entries(data).filter(([key]) => key !== "programkode");
  if (entries.length === 0) return null;

  const arrayEntries = entries.filter(([, value]) => Array.isArray(value));
  const sameLength =
    arrayEntries.length >= 2 &&
    arrayEntries.every(
      ([, value]) =>
        (value as unknown[]).length === (arrayEntries[0][1] as unknown[]).length,
    );

  return (
    <div className="data-panel" aria-label="Oppgavedata">
      {sameLength ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>{arrayEntries.map(([key]) => <th key={key}>{labelFor(key)}</th>)}</tr>
            </thead>
            <tbody>
              {(arrayEntries[0][1] as unknown[]).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {arrayEntries.map(([key, value]) => (
                    <td key={key}>{formatValue((value as unknown[])[rowIndex])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <dl className="data-list">
        {entries
          .filter(([key]) => !sameLength || !arrayEntries.some(([arrayKey]) => arrayKey === key))
          .map(([key, value]) => (
            <div key={key}>
              <dt>{labelFor(key)}</dt>
              <dd>{formatValue(value)}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

type Point = { x: number; y: number };

function functionFromExpression(expression: string) {
  const compact = expression.replace(/\s/g, "");
  const exponential = compact.match(/^([+-]?\d+(?:\.\d+)?)\*([+-]?\d+(?:\.\d+)?)\^x$/);
  if (exponential) {
    const a = Number(exponential[1]);
    const b = Number(exponential[2]);
    return (x: number) => a * b ** x;
  }
  const constantFirst = compact.match(/^([+-]?\d+(?:\.\d+)?)\+([+-]?\d+(?:\.\d+)?)\*x$/);
  if (constantFirst) {
    const intercept = Number(constantFirst[1]);
    const slope = Number(constantFirst[2]);
    return (x: number) => intercept + slope * x;
  }
  const slopeFirst = compact.match(/^([+-]?\d+(?:\.\d+)?)\*x\+([+-]?\d+(?:\.\d+)?)$/);
  if (slopeFirst) {
    const slope = Number(slopeFirst[1]);
    const intercept = Number(slopeFirst[2]);
    return (x: number) => intercept + slope * x;
  }
  return null;
}

function linePath(
  points: Point[],
  scaleX: (x: number) => number,
  scaleY: (y: number) => number,
) {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point.x)},${scaleY(point.y)}`)
    .join(" ");
}

function Plot({
  series,
  labels,
  description,
}: {
  series: { name: string; points: Point[] }[];
  labels?: string[];
  description: string;
}) {
  const width = 640;
  const height = 260;
  const padding = 32;
  const colors = ["#19766e", "#315f92", "#aa6a2f"];
  const allPoints = series.flatMap((item) => item.points);
  const xs = allPoints.map((point) => point.x);
  const ys = allPoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(...ys);
  const scaleX = (x: number) => padding + ((x - minX) / Math.max(1, maxX - minX)) * (width - padding * 2);
  const scaleY = (y: number) => height - padding - ((y - minY) / Math.max(1, maxY - minY)) * (height - padding * 2);

  return (
    <figure className="visual-card">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={description}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="chart-axis" />
        {series.map((item, seriesIndex) => (
          <g key={item.name}>
            {item.points.length > 1 && (
              <path d={linePath(item.points, scaleX, scaleY)} fill="none" stroke={colors[seriesIndex % colors.length]} strokeWidth="3" />
            )}
            {item.points.map((point, index) => (
              <circle key={index} cx={scaleX(point.x)} cy={scaleY(point.y)} r="4" fill={colors[seriesIndex % colors.length]} />
            ))}
          </g>
        ))}
      </svg>
      {(labels?.length || series.length > 1) && (
        <figcaption className="chart-legend">
          {labels?.map((label, index) => <span key={label}>{index + 1}: {label}</span>)}
          {series.length > 1 && series.map((item, index) => (
            <span key={item.name}><i style={{ background: colors[index % colors.length] }} />{item.name}</span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

function BarChart({ labels, series, description }: { labels: string[]; series: { name: string; values: number[] }[]; description: string }) {
  const max = Math.max(1, ...series.flatMap((item) => item.values));
  return (
    <figure className="visual-card" role="img" aria-label={description}>
      <div className="bar-chart" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(34px, 1fr))` }}>
        {labels.map((label, labelIndex) => (
          <div className="bar-group" key={label}>
            <div className="bars">
              {series.map((item, seriesIndex) => (
                <span key={item.name} style={{ height: `${Math.max(4, ((item.values[labelIndex] ?? 0) / max) * 150)}px` }} data-series={seriesIndex} title={`${item.name}: ${item.values[labelIndex]}`} />
              ))}
            </div>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <figcaption className="chart-legend">
        {series.map((item, index) => <span key={item.name}><i data-series={index} />{item.name}</span>)}
      </figcaption>
    </figure>
  );
}

export function VisualizationPanel({ visualization, data }: { visualization?: Visualization; data?: Record<string, unknown> }) {
  if (!visualization) return null;
  const type = visualization.type;
  if (type === "programkode") {
    return <pre className="code-panel" aria-label={`${visualization.sprak ?? "Program"}-kode`}><code>{String(visualization.kode ?? "")}</code></pre>;
  }
  if (type === "tabell") {
    const columns = (visualization.kolonner as string[]) ?? [];
    const rows = (visualization.rader as unknown[][]) ?? [];
    return (
      <div className="data-panel data-table-wrap">
        <table className="data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell}>{formatValue(value)}</td>)}</tr>)}</tbody></table>
      </div>
    );
  }
  if (type === "figurmønster") {
    const values = (visualization.verdier as number[]) ?? [];
    return (
      <figure className="visual-card pattern-card" aria-label={visualization.tekstalternativ ?? "Figurmønster"}>
        {values.map((value, index) => <div key={index}><div className="pattern-dots">{Array.from({ length: Math.min(value, 30) }, (_, dot) => <i key={dot} />)}</div><small>Figur {index + 1}: {value}</small></div>)}
      </figure>
    );
  }
  if (type === "gruppert_søylediagram") {
    return <BarChart labels={(visualization.kategorier as string[]) ?? []} series={((visualization.serier as { navn: string; verdier: number[] }[]) ?? []).map((item) => ({ name: item.navn, values: item.verdier }))} description="Gruppert søylediagram" />;
  }
  if (type === "histogramdata") {
    const limits = (visualization.klassegrenser as number[]) ?? [];
    const values = (visualization.frekvenser as number[]) ?? [];
    return <BarChart labels={values.map((_, index) => `${limits[index]}–${limits[index + 1]}`)} series={[{ name: "Frekvens", values }]} description="Histogram" />;
  }
  if (type === "prosentforløp") {
    return <BarChart labels={(visualization.etiketter as string[]) ?? []} series={[{ name: "Verdi", values: (visualization.verdier as number[]) ?? [] }]} description="Verdier gjennom to prosentendringer" />;
  }
  if (type === "sammenlignende_punktdiagram") {
    const series = ((visualization.serier as { navn: string; verdier: number[] }[]) ?? []).map((item) => ({ name: item.navn, points: item.verdier.map((y, index) => ({ x: index + 1, y })) }));
    return <Plot series={series} description="Sammenlignende punktdiagram" />;
  }
  if (["punktdiagram", "spredningsdiagram"].includes(type)) {
    const xs = (visualization.x as number[]) ?? [];
    const ys = (visualization.y as number[]) ?? [];
    return <Plot series={[{ name: "Data", points: xs.map((x, index) => ({ x, y: ys[index] })) }]} description={type === "spredningsdiagram" ? "Spredningsdiagram" : "Punktdiagram"} />;
  }
  if (type === "funksjonsgraf" || type === "funksjonsgrafer") {
    const min = Number(visualization.x_min ?? 0);
    const max = Number(visualization.x_max ?? 10);
    const graphs = (visualization.grafer as { uttrykk: string; etikett: string }[]) ?? [];
    const series = graphs.map((graph) => {
      const calculate = functionFromExpression(graph.uttrykk);
      const points = calculate ? Array.from({ length: 31 }, (_, index) => { const x = min + ((max - min) * index) / 30; return { x, y: calculate(x) }; }) : [];
      return { name: `${graph.etikett}: ${graph.uttrykk}`, points };
    });
    return <Plot series={series} description="Funksjonsgraf" />;
  }
  if (type === "omvendt_proporsjonal_graf") {
    const min = Number(visualization.x_min ?? 1);
    const max = Number(visualization.x_max ?? 15);
    const fixed = Number(visualization.fast_ledd ?? 0);
    const observation = data?.observasjon as { x?: number; T?: number } | undefined;
    const k = observation?.x && observation?.T ? observation.x * (observation.T - fixed) : 1;
    const points = Array.from({ length: 31 }, (_, index) => { const x = min + ((max - min) * index) / 30; return { x, y: k / x + fixed }; });
    return <Plot series={[{ name: `T(x) = ${k}/x + ${fixed}`, points }]} description="Graf for en omvendt proporsjonal modell" />;
  }
  return null;
}
