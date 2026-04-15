import { AdminMetrics } from '@/hooks/useAdminDashboardMetrics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

interface Props {
  metrics: AdminMetrics;
}

export const AdminRevenueChart = ({ metrics }: Props) => {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
      {/* MRR + Users Growth */}
      <Card className="glass-card overflow-hidden lg:col-span-2">
        <div className="h-1 bg-gradient-brand-horizontal" />
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Crescimento Mensal</CardTitle>
          <CardDescription className="text-xs">Novos usuários e receita estimada (6 meses)</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-64">
            {metrics.userGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.userGrowth} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'users' ? value : `R$ ${value.toFixed(2)}`,
                      name === 'users' ? 'Novos Usuários' : 'MRR Estimado'
                    ]}
                  />
                  <Legend formatter={(value) => value === 'users' ? 'Novos Usuários' : 'MRR Estimado'} />
                  <Bar yAxisId="left" dataKey="users" fill="hsl(205 96% 46%)" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="right" dataKey="mrr" fill="hsl(273 63% 42%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Sem dados suficientes
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Distribution */}
      <Card className="glass-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#7328b1] to-[#af1188]" />
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Distribuição de Planos</CardTitle>
          <CardDescription className="text-xs">Proporção atual</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-52">
            {metrics.planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {metrics.planDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [`${value} usuários`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {metrics.planDistribution.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-muted-foreground">{p.name}</span>
                <span className="font-semibold">{p.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
