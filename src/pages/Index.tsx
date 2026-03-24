import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { generateGames, fetchLatestDraw, checkGame, type Game, type DrawResult } from "@/lib/lotofacil";
import GameCard, { getPrizeValue } from "@/components/GameCard";
import LotteryBall from "@/components/LotteryBall";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, Search, Loader2, Clover, Trophy, Banknote } from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const [numbersPerGame, setNumbersPerGame] = useState(15);
  const [gameCount, setGameCount] = useState(1);
  const [games, setGames] = useState<Game[]>([]);
  const [draw, setDraw] = useState<DrawResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleGenerate = () => {
    const newGames = generateGames(gameCount, numbersPerGame);
    setGames(newGames);
    setDraw(null);
    toast({ title: `${gameCount} jogo(s) gerado(s)!`, description: `${numbersPerGame} números por jogo` });
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
      setChecking(true);
      toast({ title: `Concurso ${result.concurso}`, description: `Resultado: ${result.dezenas.join(", ")}` });
    } catch {
      toast({ title: "Erro ao buscar resultado", description: "Tente novamente mais tarde.", variant: "destructive" });
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
    const costs: Record<number, number> = { 15: 3, 16: 48, 17: 408, 18: 2448, 19: 11628, 20: 46512 };
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
              <label className="text-sm font-medium text-foreground">Quantidade de jogos</label>
              <Select value={String(gameCount)} onValueChange={(v) => setGameCount(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1} jogo{i > 0 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleGenerate} className="flex-1 gap-2" size="lg">
              <Dices className="w-5 h-5" />
              Gerar Jogos
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="p-5 space-y-3 border-primary/30 shadow-xl" style={{ background: "var(--gradient-hero)" }}>
                <div className="flex items-center gap-2">
                  <Banknote className="w-6 h-6 text-primary-foreground" />
                  <h2 className="text-lg font-bold text-primary-foreground">Resumo de Prêmios</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 text-primary-foreground/90 text-sm">
                  <div>Custo das apostas:</div>
                  <div className="font-semibold text-right">{formatCurrency(betCost)}</div>
                  <div>Total de prêmios:</div>
                  <div className="font-bold text-right text-lg">{formatCurrency(totalPrize)}</div>
                  <div className="border-t border-primary-foreground/20 pt-2">Lucro:</div>
                  <div className={`border-t border-primary-foreground/20 pt-2 font-bold text-right text-lg ${totalPrize - betCost >= 0 ? "" : "text-ball-miss"}`}>
                    {formatCurrency(totalPrize - betCost)}
                  </div>
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
