import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  generateGames,
  fetchLatestDraw,
  fetchLast5Draws,
  analyzeDraws,
  analyzeDrawsEinstein,
  generateSmartGames,
  generateEinsteinGames,
  generateCombinedGames,
  checkGame,
  type Game,
  type DrawResult,
  type MotorAnalysis,
  type EinsteinAnalysis,
} from "@/lib/lotofacil";
import GameCard, { getPrizeValue } from "@/components/GameCard";
import LotteryBall from "@/components/LotteryBall";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, Search, Loader2, Clover, Trophy, Banknote, Brain, TrendingUp, Flame, Snowflake, Atom, Orbit, Sparkles, Sigma, Zap } from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const [numbersPerGame, setNumbersPerGame] = useState(15);
  const [gameCount, setGameCount] = useState(1);
  const [games, setGames] = useState<Game[]>([]);
  const [draw, setDraw] = useState<DrawResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMotors, setSelectedMotors] = useState<Set<string>>(new Set());
  const [motorLoading, setMotorLoading] = useState(false);
  const [analysis, setAnalysis] = useState<MotorAnalysis | null>(null);
  const [einsteinAnalysis, setEinsteinAnalysis] = useState<EinsteinAnalysis | null>(null);

  const toggleMotor = (motor: string) => {
    setSelectedMotors(prev => {
      const next = new Set(prev);
      if (next.has(motor)) next.delete(motor);
      else next.add(motor);
      if (next.size > 0 && !analysis) loadAnalysis();
      return next;
    });
  };

  const loadAnalysis = async () => {
    setMotorLoading(true);
    try {
      const draws = await fetchLast5Draws();
      const newAnalysis = analyzeDraws(draws);
      const newEinstein = analyzeDrawsEinstein(draws);
      setAnalysis(newAnalysis);
      setEinsteinAnalysis(newEinstein);
      toast({ title: "🧠 Análise atualizada!", description: `Concursos ${draws[0].concurso}–${draws[draws.length - 1].concurso}` });
    } catch {
      toast({ title: "Erro ao analisar concursos", variant: "destructive" });
    } finally {
      setMotorLoading(false);
    }
  };

  const handleGenerate = async () => {
    const hasPreditivo = selectedMotors.has("preditivo");
    const hasEinstein = selectedMotors.has("einstein");

    if (hasPreditivo || hasEinstein) {
      setMotorLoading(true);
      try {
        let a = analysis;
        let e = einsteinAnalysis;
        if (!a || !e) {
          toast({ title: "🧠 Analisando últimos 5 concursos..." });
          const draws = await fetchLast5Draws();
          a = analyzeDraws(draws);
          e = analyzeDrawsEinstein(draws);
          setAnalysis(a);
          setEinsteinAnalysis(e);
        }

        let newGames: Game[];
        if (hasPreditivo && hasEinstein) {
          newGames = generateCombinedGames(a, e, gameCount, numbersPerGame);
        } else if (hasEinstein) {
          newGames = generateEinsteinGames(e, gameCount, numbersPerGame);
        } else {
          newGames = generateSmartGames(a, gameCount, numbersPerGame);
        }
        setGames(newGames);
        setDraw(null);

        const names: string[] = [];
        if (hasPreditivo) names.push("Preditivo");
        if (hasEinstein) names.push("Einstein");
        toast({ title: `🧠 ${gameCount} jogo(s) gerado(s) — ${names.join(" + ")}!` });
      } catch {
        toast({ title: "Erro ao gerar jogos", variant: "destructive" });
      } finally {
        setMotorLoading(false);
      }
    } else {
      const newGames = generateGames(gameCount, numbersPerGame);
      setGames(newGames);
      setDraw(null);
      toast({ title: `${gameCount} jogo(s) gerado(s)!`, description: `${numbersPerGame} números por jogo` });
    }
  };

  const handleCheck = async () => {
    if (games.length === 0) {
      toast({ title: "Gere jogos primeiro!", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await fetchLatestDraw();
      setDraw(result);
      toast({ title: `Concurso ${result.concurso}`, description: `Resultado: ${result.dezenas.join(", ")}` });
    } catch {
      toast({ title: "Erro ao buscar resultado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resultNumbers = draw ? draw.dezenas.map(Number) : undefined;

  const totalPrize = useMemo(() => {
    if (!resultNumbers) return 0;
    return games.reduce((sum, game) => {
      const { matches } = checkGame(game, resultNumbers);
      return sum + getPrizeValue(matches);
    }, 0);
  }, [games, resultNumbers]);

  const betCost = useMemo(() => {
    const costs: Record<number, number> = { 15: 3.5, 16: 56, 17: 476, 18: 2856, 19: 13566, 20: 54264 };
    return (costs[numbersPerGame] || 3) * games.length;
  }, [numbersPerGame, games.length]);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="w-full py-10 px-4" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="inline-flex items-center gap-2"
          >
            <Clover className="w-8 h-8 text-primary-foreground" />
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
              Lotofácil
            </h1>
          </motion.div>
          <p className="text-primary-foreground/80 text-sm md:text-base">
            Gere seus jogos e confira os resultados automaticamente
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 pb-12 space-y-6">
        {/* Controls */}
        <Card className="p-5 space-y-5 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Números por jogo: <span className="font-bold text-primary">{numbersPerGame}</span>
              </label>
              <Slider
                value={[numbersPerGame]}
                onValueChange={([v]) => setNumbersPerGame(v)}
                min={15}
                max={20}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>15</span>
                <span>20</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Quantidade de jogos: <span className="font-bold text-primary">{gameCount}</span>
              </label>
              <Input
                type="number"
                min={1}
                value={gameCount}
                onChange={(e) => setGameCount(Math.max(1, Number(e.target.value) || 1))}
                className="text-center"
              />
            </div>
          </div>

          {/* Motor Selection */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-primary" />
              <label className="text-sm font-medium text-foreground">Motores IA</label>
              <span className="text-[10px] text-muted-foreground">(selecione um ou mais)</span>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => toggleMotor("preditivo")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  selectedMotors.has("preditivo")
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Brain className="w-3.5 h-3.5" /> Preditivo
                {selectedMotors.has("preditivo") && <span className="ml-1 text-[10px]">✓</span>}
              </button>
              <button
                onClick={() => toggleMotor("einstein")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  selectedMotors.has("einstein")
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Atom className="w-3.5 h-3.5" /> Einstein
                {selectedMotors.has("einstein") && <span className="ml-1 text-[10px]">✓</span>}
              </button>
            </div>

            {selectedMotors.size === 0 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                <Dices className="w-3.5 h-3.5 inline mr-1" />
                Nenhum motor selecionado — geração aleatória
              </p>
            )}

            {selectedMotors.size === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="p-2.5 bg-primary/5 border-primary/20 text-center">
                  <p className="text-xs text-primary font-medium">
                    ⚡ Modo Combinado — Pesos de ambos os motores serão fundidos
                  </p>
                </Card>
              </motion.div>
            )}

            {/* Preditivo Analysis Panel */}
            <AnimatePresence>
              {selectedMotors.has("preditivo") && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                  {motorLoading && !analysis ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Analisando últimos 5 concursos...</span>
                    </div>
                  ) : analysis ? (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground text-center">
                        Concursos: <span className="font-semibold text-foreground">{analysis.draws.map(d => d.concurso).join(", ")}</span>
                        <Button variant="ghost" size="sm" className="ml-2 h-6 text-xs" onClick={loadAnalysis} disabled={motorLoading}>
                          {motorLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "↻"}
                        </Button>
                      </div>
                      <Card className="p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Flame className="w-3.5 h-3.5 text-destructive" /> Números Quentes
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {analysis.hotNumbers.slice(0, 10).map((n, i) => (
                            <motion.span key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-primary text-primary-foreground">{n}</motion.span>
                          ))}
                        </div>
                      </Card>
                      <Card className="p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Snowflake className="w-3.5 h-3.5 text-muted-foreground" /> Números Frios
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {analysis.coldNumbers.slice(0, 10).map((n, i) => (
                            <motion.span key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">{n}</motion.span>
                          ))}
                        </div>
                      </Card>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Card className="p-2.5 bg-muted/30 text-center">
                          <div className="text-muted-foreground">Par / Ímpar</div>
                          <div className="font-bold text-foreground">{analysis.evenOddRatio.even} / {analysis.evenOddRatio.odd}</div>
                        </Card>
                        <Card className="p-2.5 bg-muted/30 text-center">
                          <div className="text-muted-foreground">Distribuição Linhas</div>
                          <div className="font-bold text-foreground font-mono">{analysis.rowDistribution.join(" · ")}</div>
                        </Card>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center">
                        <TrendingUp className="w-3 h-3" /> Pesos baseados em frequência e padrões
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Einstein Analysis Panel */}
            <AnimatePresence>
              {selectedMotors.has("einstein") && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                  {motorLoading && !einsteinAnalysis ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Calculando entropia e equilíbrio...</span>
                    </div>
                  ) : einsteinAnalysis ? (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground text-center">
                        Concursos: <span className="font-semibold text-foreground">{einsteinAnalysis.draws.map(d => d.concurso).join(", ")}</span>
                        <Button variant="ghost" size="sm" className="ml-2 h-6 text-xs" onClick={loadAnalysis} disabled={motorLoading}>
                          {motorLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "↻"}
                        </Button>
                      </div>
                      <Card className="p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Sigma className="w-3.5 h-3.5 text-primary" /> Distribuição de Boltzmann
                        </div>
                        <p className="text-[10px] text-muted-foreground">Números em equilíbrio termodinâmico estatístico</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(einsteinAnalysis.boltzmannWeights)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 10)
                            .map(([n, w], i) => (
                              <motion.span key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-accent text-accent-foreground"
                                title={`Peso: ${w.toFixed(3)}`}
                              >{n}</motion.span>
                            ))}
                        </div>
                      </Card>
                      <div className="grid grid-cols-2 gap-2">
                        <Card className="p-3 space-y-2 bg-muted/30">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Orbit className="w-3.5 h-3.5 text-primary" /> Equilíbrio
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {einsteinAnalysis.equilibriumState.slice(0, 6).map((n, i) => (
                              <motion.span key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.04 }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold bg-primary text-primary-foreground"
                              >{n}</motion.span>
                            ))}
                          </div>
                        </Card>
                        <Card className="p-3 space-y-2 bg-muted/30">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Sparkles className="w-3.5 h-3.5 text-accent" /> Desvio
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {einsteinAnalysis.deviationNumbers.slice(0, 6).map((n, i) => (
                              <motion.span key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.04 }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border"
                              >{n}</motion.span>
                            ))}
                          </div>
                        </Card>
                      </div>
                      <Card className="p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Atom className="w-3.5 h-3.5 text-primary" /> Razão Áurea (φ = 1.618)
                        </div>
                        <p className="text-[10px] text-muted-foreground">Posições alinhadas com a proporção dourada</p>
                        <div className="flex flex-wrap gap-1">
                          {einsteinAnalysis.goldenRatioPositions.slice(0, 10).map((n, i) => (
                            <motion.span key={n} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: i * 0.06, type: "spring" }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/40"
                            >{n}</motion.span>
                          ))}
                        </div>
                      </Card>
                      {einsteinAnalysis.hiddenPatterns.length > 0 && (
                        <Card className="p-3 space-y-2 bg-muted/30">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Sparkles className="w-3.5 h-3.5 text-accent" /> Variáveis Ocultas
                          </div>
                          <p className="text-[10px] text-muted-foreground">Pares que aparecem juntos em 80%+ dos sorteios</p>
                          <div className="flex flex-wrap gap-1">
                            {einsteinAnalysis.hiddenPatterns.slice(0, 5).map((pair, i) => (
                              <span key={i} className="text-xs font-mono bg-accent/20 text-accent-foreground px-2 py-1 rounded">
                                {pair.join(" ↔ ")}
                              </span>
                            ))}
                          </div>
                        </Card>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center">
                        <Atom className="w-3 h-3" /> Entropia de Shannon · Boltzmann · Simetria · Razão Áurea
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleGenerate}
              className="flex-1 gap-2"
              size="lg"
              disabled={motorLoading && selectedMotors.size > 0}
            >
              {motorLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : selectedMotors.size === 2 ? (
                <Zap className="w-5 h-5" />
              ) : selectedMotors.has("einstein") ? (
                <Atom className="w-5 h-5" />
              ) : selectedMotors.has("preditivo") ? (
                <Brain className="w-5 h-5" />
              ) : (
                <Dices className="w-5 h-5" />
              )}
              {selectedMotors.size === 2
                ? "Gerar Combinado"
                : selectedMotors.has("einstein")
                ? "Gerar com Einstein"
                : selectedMotors.has("preditivo")
                ? "Gerar com Preditivo"
                : "Gerar Jogos"}
            </Button>
            <Button
              onClick={handleCheck}
              variant="outline"
              className="flex-1 gap-2"
              size="lg"
              disabled={loading || games.length === 0}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Conferir Resultado
            </Button>
          </div>
        </Card>

        {/* Draw Result */}
        <AnimatePresence>
          {draw && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="p-5 space-y-3 border-accent/50 shadow-lg">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  <h2 className="font-bold text-foreground">
                    Concurso {draw.concurso} — {draw.data}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {draw.dezenas.map((d, i) => (
                    <LotteryBall key={d} number={Number(d)} variant="result" delay={i} />
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Games */}
        {games.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Seus Jogos</h2>
              <span className="text-sm text-muted-foreground">
                Custo total: <span className="font-semibold text-foreground">{formatCurrency(betCost)}</span>
              </span>
            </div>
            {games.map((game, i) => (
              <GameCard key={i} game={game} index={i} result={resultNumbers} />
            ))}
          </div>
        )}

        {/* Prize Summary */}
        <AnimatePresence>
          {resultNumbers && totalPrize > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card className="p-5 space-y-3 border-primary/30 shadow-xl overflow-hidden relative" style={{ background: "var(--gradient-hero)" }}>
                {/* Animated shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, repeatDelay: 3 }}
                />
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <Banknote className="w-6 h-6 text-primary-foreground" />
                  </motion.div>
                  <h2 className="text-lg font-bold text-primary-foreground">Resumo de Prêmios</h2>
                </motion.div>
                <div className="grid grid-cols-2 gap-3 text-primary-foreground/90 text-sm relative z-10">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    Custo das apostas:
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="font-semibold text-right">
                    {formatCurrency(betCost)}
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    Total de prêmios:
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 400 }}
                    className="font-bold text-right text-lg"
                  >
                    {formatCurrency(totalPrize)}
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="border-t border-primary-foreground/20 pt-2">
                    Lucro:
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: [0.5, 1.2, 1] }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className={`border-t border-primary-foreground/20 pt-2 font-bold text-right text-lg ${totalPrize - betCost >= 0 ? "" : "text-ball-miss"}`}
                  >
                    {formatCurrency(totalPrize - betCost)}
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
