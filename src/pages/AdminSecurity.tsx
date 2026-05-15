import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ShieldAlert, RefreshCw, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface CspViolationRow {
  id: string;
  created_at: string;
  document_uri: string | null;
  blocked_uri: string | null;
  violated_directive: string | null;
  effective_directive: string | null;
  source_file: string | null;
  line_number: number | null;
  user_agent: string | null;
}

const PAGE_SIZE = 100;
const MAX_ROWS = 500;

function shortHost(url: string | null | undefined): string {
  if (!url) return "—";
  try {
    const u = new URL(url);
    return u.host || u.pathname.slice(0, 40);
  } catch {
    return url.slice(0, 40);
  }
}

function topN<T>(items: T[], keyFn: (i: T) => string, n = 10) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it) || "(vazio)";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

export default function AdminSecurity() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<CspViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDirective, setFilterDirective] = useState<string>("__all__");
  const [filterUrl, setFilterUrl] = useState("");
  const [filterDays, setFilterDays] = useState<string>("7");
  const [page, setPage] = useState(0);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const since = new Date();
      const days = parseInt(filterDays, 10);
      since.setDate(since.getDate() - (Number.isFinite(days) ? days : 7));

      let q = supabase
        .from("csp_violations")
        .select(
          "id, created_at, document_uri, blocked_uri, violated_directive, effective_directive, source_file, line_number, user_agent",
        )
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS);

      if (filterDays !== "all") {
        q = q.gte("created_at", since.toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as CspViolationRow[]);
      setPage(0);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, filterDays]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (
        filterDirective !== "__all__" &&
        (r.effective_directive ?? r.violated_directive ?? "") !== filterDirective
      ) {
        return false;
      }
      if (filterUrl) {
        const hay = `${r.document_uri ?? ""} ${r.blocked_uri ?? ""} ${r.source_file ?? ""}`.toLowerCase();
        if (!hay.includes(filterUrl.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, filterDirective, filterUrl]);

  const directives = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((r) => r.effective_directive ?? r.violated_directive ?? "")
            .filter(Boolean),
        ),
      ).sort(),
    [rows],
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const today = filtered.filter(
      (r) => now - new Date(r.created_at).getTime() < dayMs,
    ).length;
    const last7 = filtered.filter(
      (r) => now - new Date(r.created_at).getTime() < 7 * dayMs,
    ).length;
    return { total: filtered.length, today, last7 };
  }, [filtered]);

  const topDirectives = useMemo(
    () =>
      topN(filtered, (r) => r.effective_directive ?? r.violated_directive ?? ""),
    [filtered],
  );
  const topPages = useMemo(
    () => topN(filtered, (r) => shortHost(r.document_uri)),
    [filtered],
  );
  const topBlocked = useMemo(
    () => topN(filtered, (r) => shortHost(r.blocked_uri)),
    [filtered],
  );

  const trend = useMemo(() => {
    const buckets = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of filtered) {
      const k = r.created_at.slice(0, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    return [...buckets.entries()];
  }, [filtered]);
  const trendMax = Math.max(1, ...trend.map(([, v]) => v));

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  if (authLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Security Observability
          </h1>
          <p className="text-sm text-muted-foreground">
            Violações de Content-Security-Policy capturadas em produção (modo Report-Only).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total no período</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Últimas 24h</CardDescription>
            <CardTitle className="text-3xl">{stats.today}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Últimos 7 dias</CardDescription>
            <CardTitle className="text-3xl">{stats.last7}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tendência (7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {trend.map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/70 rounded-t-md transition-all"
                  style={{ height: `${(count / trendMax) * 100}%`, minHeight: 2 }}
                  title={`${day}: ${count}`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {day.slice(5)}
                </span>
                <span className="text-[10px] font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopList title="Top diretivas" items={topDirectives} />
        <TopList title="Top páginas afetadas" items={topPages} />
        <TopList title="Top recursos bloqueados" items={topBlocked} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={filterDays} onValueChange={setFilterDays}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Últimas 24h</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDirective} onValueChange={setFilterDirective}>
              <SelectTrigger>
                <SelectValue placeholder="Diretiva" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as diretivas</SelectItem>
                {directives.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Filtrar por URL/recurso"
              value={filterUrl}
              onChange={(e) => setFilterUrl(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Eventos ({filtered.length}
            {rows.length >= MAX_ROWS ? "+" : ""})
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </Button>
            <span>
              Página {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : pageRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma violação no período selecionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Diretiva</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>Bloqueado</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {r.effective_directive ?? r.violated_directive ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-xs max-w-[220px] truncate"
                        title={r.document_uri ?? ""}
                      >
                        {shortHost(r.document_uri)}
                      </TableCell>
                      <TableCell
                        className="text-xs max-w-[260px] truncate"
                        title={r.blocked_uri ?? ""}
                      >
                        {r.blocked_uri ?? "—"}
                      </TableCell>
                      <TableCell
                        className="text-xs max-w-[220px] truncate"
                        title={r.source_file ?? ""}
                      >
                        {r.source_file ? `${shortHost(r.source_file)}:${r.line_number ?? "?"}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TopList({
  title,
  items,
}: {
  title: string;
  items: { key: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="truncate font-mono" title={it.key}>
                    {it.key}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {it.count}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/70"
                    style={{ width: `${(it.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
