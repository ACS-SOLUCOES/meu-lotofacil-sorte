import { Card } from "@/components/ui/card";
import LotteryBall from "./LotteryBall";
import { checkGame, type Game } from "@/lib/lotofacil";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Trophy, PartyPopper, Star } from "lucide-react";

interface GameCardProps {
  game: Game;
  index: number;
  result?: number[];
}

const PRIZE_MAP: Record<number, number> = {
  11: 7,
  12: 14,
  13: 35,
  14: 2500,
  15: 2000000,
};

const PRIZE_LABELS: Record<number, string> = {
  15: "🏆 1º Prêmio",
  14: "🥈 2º Prêmio",
  13: "🥉 3º Prêmio",
  12: "4º Prêmio",
  11: "5º Prêmio",
};

export function getPrizeValue(matches: number): number {
  return PRIZE_MAP[matches] || 0;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const GameCard = ({ game, index, result }: GameCardProps) => {
  const check = result ? checkGame(game, result) : null;
  const prize = check ? PRIZE_MAP[check.matches] : undefined;
  const prizeLabel = check ? PRIZE_LABELS[check.matches] : undefined;
  const isWinner = check && check.matches >= 11;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className={`p-4 space-y-3 transition-all duration-300 ${
          isWinner
            ? "ring-2 ring-accent shadow-xl border-accent/40"
            : ""
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Jogo {index + 1}</span>
          {check && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={isWinner ? "default" : "secondary"}
                className={isWinner ? "bg-primary text-primary-foreground" : ""}
              >
                {check.matches} acertos
              </Badge>
              {prizeLabel && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, delay: 0.3 }}
                >
                  <Badge className="bg-accent text-accent-foreground gap-1">
                    {check.matches >= 14 ? <PartyPopper className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                    {prizeLabel}
                  </Badge>
                </motion.div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {game.map((n, i) => (
            <LotteryBall
              key={n}
              number={n}
              delay={i}
              size="sm"
              variant={
                check
                  ? check.matched.includes(n)
                    ? "match"
                    : "miss"
                  : "default"
              }
            />
          ))}
        </div>

        {isWinner && prize !== undefined && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="flex items-center gap-2 pt-2 border-t border-border"
          >
            <Trophy className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm font-medium text-foreground">Prêmio:</span>
            <motion.span
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, delay: 0.6 }}
              className="text-sm font-bold text-primary"
            >
              {formatCurrency(prize)}
            </motion.span>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

export default GameCard;
