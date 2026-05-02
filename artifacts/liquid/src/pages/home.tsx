import React from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Activity, Bell, FileText, Settings, ShieldAlert, Zap } from "lucide-react";

// Mock Data
const techSectorData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
  { name: 'Jul', value: 3490 },
  { name: 'Aug', value: 4100 },
  { name: 'Sep', value: 4800 },
  { name: 'Oct', value: 5100 },
  { name: 'Nov', value: 5900 },
  { name: 'Dec', value: 6200 },
];

const volatilityData = [
  { name: '1', value: 15 },
  { name: '2', value: 18 },
  { name: '3', value: 12 },
  { name: '4', value: 22 },
  { name: '5', value: 28 },
  { name: '6', value: 25 },
  { name: '7', value: 19 },
  { name: '8', value: 14 },
  { name: '9', value: 12 },
  { name: '10', value: 16 },
  { name: '11', value: 24 },
  { name: '12', value: 20 },
];

const transactions = [
  { asset: 'SpaceX PE', type: 'BUY', amount: '$420,000', date: '2026-03-12', status: 'SETTLED' },
  { asset: 'NVIDIA Opt', type: 'SELL', amount: '$150,000', date: '2026-03-14', status: 'PROCESSING' },
  { asset: 'Palantir War', type: 'BUY', amount: '$85,000', date: '2026-03-15', status: 'PENDING' },
  { asset: 'OpenAI Note', type: 'CONVERT', amount: '$500,000', date: '2026-03-16', status: 'SETTLED' },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full text-foreground flex flex-col" style={{ backgroundColor: "#0B0B0B" }}>
      
      {/* Top Navigation */}
      <nav className="w-full flex flex-col border-b border-purple-glow">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <span className="font-poppins font-light text-2xl tracking-wider" style={{ color: "#9126EF" }}>LIQUID</span>
            <div className="hidden md:flex items-center gap-6">
              {['Portfolio', 'Markets', 'Assets', 'Alerts'].map(link => (
                <button key={link} className="font-montserrat text-sm text-[#9126EF]/70 hover:text-[#9126EF] transition-colors" data-testid={`nav-link-${link.toLowerCase()}`}>
                  {link}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-purple-glow" style={{ backgroundColor: "#0D0D0F" }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#32CD32", boxShadow: "0 0 8px #32CD32" }}></div>
              <span className="font-montserrat text-xs uppercase font-semibold" style={{ color: "#32CD32" }}>Pro Terminal</span>
            </div>
            <Avatar className="h-8 w-8 border border-purple-glow cursor-pointer">
              <AvatarFallback className="bg-[#0D0D0F] text-[#9126EF] font-montserrat text-xs">UHN</AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        {/* Ticker Tape */}
        <div className="w-full overflow-hidden flex items-center h-8 border-t border-purple-glow bg-[#0B0B0B] whitespace-nowrap">
          <div className="inline-block ticker-tape font-inter text-xs text-[#9126EF]/80 font-medium space-x-8">
            <span>GOLD $3,247.80 <span className="text-[#32CD32]">+1.2% ▲</span></span>
            <span>|</span>
            <span>SILVER $32.41 <span className="text-[#ef2626]">-0.4% ▼</span></span>
            <span>|</span>
            <span>PLATINUM $1,018.00 <span className="text-[#32CD32]">+0.8% ▲</span></span>
            <span>|</span>
            <span>REAL ESTATE IDX $842.50 <span className="text-[#32CD32]">+2.1% ▲</span></span>
            <span>|</span>
            <span>RARE WHISKY IDX $2,104.00 <span className="text-[#32CD32]">+0.3% ▲</span></span>
            <span>|</span>
            <span>FINE ART IDX $5,880.00 <span className="text-[#ef2626]">-1.1% ▼</span></span>
            <span>|</span>
            <span>DIAMONDS $8,240.00 <span className="text-[#32CD32]">+0.6% ▲</span></span>
            <span>|</span>
            {/* Duplicate for infinite effect */}
            <span>GOLD $3,247.80 <span className="text-[#32CD32]">+1.2% ▲</span></span>
            <span>|</span>
            <span>SILVER $32.41 <span className="text-[#ef2626]">-0.4% ▼</span></span>
            <span>|</span>
            <span>PLATINUM $1,018.00 <span className="text-[#32CD32]">+0.8% ▲</span></span>
            <span>|</span>
            <span>REAL ESTATE IDX $842.50 <span className="text-[#32CD32]">+2.1% ▲</span></span>
            <span>|</span>
            <span>RARE WHISKY IDX $2,104.00 <span className="text-[#32CD32]">+0.3% ▲</span></span>
            <span>|</span>
            <span>FINE ART IDX $5,880.00 <span className="text-[#ef2626]">-1.1% ▼</span></span>
            <span>|</span>
            <span>DIAMONDS $8,240.00 <span className="text-[#32CD32]">+0.6% ▲</span></span>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-8 lg:p-12 flex flex-col gap-16">
        
        {/* Hero Metric */}
        <section className="flex flex-col items-center text-center gap-4 py-8">
          <h2 className="font-montserrat text-sm uppercase tracking-[0.2em] text-[#9126EF]/70">Total Liquid Net Worth</h2>
          <h1 className="font-poppins font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-tight leading-none">
            $24,847,320.00
          </h1>
          <div className="font-montserrat text-sm md:text-base font-semibold" style={{ color: "#32CD32" }}>
            +$312,440 today (+1.27%)
          </div>
          
          <div className="w-24 h-px mt-4" style={{ backgroundColor: "rgba(145, 38, 239, 0.5)" }}></div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
            <Button variant="outline" className="font-montserrat uppercase tracking-wider text-xs border-purple-glow hover:bg-[#9126EF]/10 text-[#9126EF] h-10 px-6 rounded-none bg-transparent" data-testid="btn-view-report">
              View Report
            </Button>
            <Button className="btn-lime-pulse font-montserrat uppercase tracking-wider text-sm h-12 px-8 rounded-none border-0" data-testid="btn-rebalance">
              Rebalance Portfolio
            </Button>
            <Button variant="outline" className="font-montserrat uppercase tracking-wider text-xs border-purple-glow hover:bg-[#9126EF]/10 text-[#9126EF] h-10 px-6 rounded-none bg-transparent" data-testid="btn-set-alert">
              Set Alert
            </Button>
          </div>
        </section>

        {/* Tech Portfolio Grid */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3 border-l-2 pl-3" style={{ borderColor: "#9126EF" }}>
            <h3 className="font-montserrat text-sm uppercase tracking-widest text-[#9126EF]/80 font-medium">Tech Portfolio</h3>
          </div>
          
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            
            {/* Alert Card */}
            <div className="card-terminal p-5 flex flex-col gap-4 rounded-sm break-inside-avoid">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" style={{ color: "#9126EF" }} />
                <h4 className="font-montserrat font-bold text-sm tracking-wider" style={{ color: "#9126EF" }}>AI SIGNAL DETECTED</h4>
              </div>
              <p className="font-inter text-sm text-gray-300 leading-relaxed">
                NVIDIA call options showing unusual volume. 94% confidence breakout within 72h.
              </p>
              <Button className="btn-lime-pulse font-montserrat uppercase text-xs h-10 mt-2 rounded-none w-full" data-testid="btn-act-now">
                Act Now
              </Button>
            </div>

            {/* Asset Card 1 */}
            <AssetCard name="Apple Inc. Equity" value="$1,847,200" change="+8.4%" changeDir="up" allocation="7.4%" />

            {/* Chart Card 1 */}
            <div className="card-terminal p-5 flex flex-col gap-4 rounded-sm break-inside-avoid">
              <h4 className="font-montserrat font-semibold text-xs tracking-wider text-gray-400 uppercase">Tech Sector Performance</h4>
              <div className="h-32 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={techSectorData}>
                    <defs>
                      <linearGradient id="colorTech" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9126EF" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#9126EF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#9126EF" strokeWidth={2} fillOpacity={1} fill="url(#colorTech)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Asset Card 2 */}
            <AssetCard name="SpaceX Private Equity" value="$4,200,000" change="+18.7%" changeDir="up" allocation="16.9%" />

            {/* Portfolio Health */}
            <div className="card-terminal p-5 flex flex-col gap-4 rounded-sm break-inside-avoid">
              <h4 className="font-montserrat font-semibold text-xs tracking-wider text-gray-400 uppercase mb-2">Portfolio Health</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-montserrat text-[10px] text-[#9126EF]/80 uppercase">Diversification</span>
                  <span className="font-poppins font-bold text-lg text-white">87<span className="text-xs text-gray-500 font-normal">/100</span></span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-montserrat text-[10px] text-[#9126EF]/80 uppercase">Liquidity Score</span>
                  <span className="font-poppins font-bold text-lg text-white">72<span className="text-xs text-gray-500 font-normal">/100</span></span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-montserrat text-[10px] text-[#9126EF]/80 uppercase">Risk Rating</span>
                  <span className="font-poppins font-bold text-sm text-yellow-500 uppercase mt-1">Moderate</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-montserrat text-[10px] text-[#9126EF]/80 uppercase">Yield</span>
                  <span className="font-poppins font-bold text-lg" style={{ color: "#32CD32" }}>4.2% <span className="text-[10px] font-normal uppercase">APY</span></span>
                </div>
              </div>
            </div>

            {/* Asset Card 3 */}
            <AssetCard name="Palantir Warrants" value="$228,000" change="-12.1%" changeDir="down" allocation="0.9%" />

            {/* Asset Card 4 */}
            <AssetCard name="NVIDIA Options" value="$842,000" change="+34.2%" changeDir="up" allocation="3.4%" />

            {/* Chart Card 2 */}
            <div className="card-terminal p-5 flex flex-col gap-4 rounded-sm break-inside-avoid">
              <h4 className="font-montserrat font-semibold text-xs tracking-wider text-gray-400 uppercase">Volatility Index</h4>
              <div className="h-32 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volatilityData}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#32CD32" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#32CD32" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#32CD32" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table Card - Conceptually spans, but fits in masonry */}
            <div className="card-terminal p-5 flex flex-col gap-4 rounded-sm break-inside-avoid">
              <h4 className="font-montserrat font-semibold text-xs tracking-wider text-gray-400 uppercase mb-2">Recent Transactions</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-purple-glow">
                      <th className="font-montserrat text-[10px] uppercase text-[#9126EF]/70 pb-2 font-medium">Asset</th>
                      <th className="font-montserrat text-[10px] uppercase text-[#9126EF]/70 pb-2 font-medium">Type</th>
                      <th className="font-montserrat text-[10px] uppercase text-[#9126EF]/70 pb-2 font-medium">Amount</th>
                      <th className="font-montserrat text-[10px] uppercase text-[#9126EF]/70 pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="font-inter text-xs">
                    {transactions.map((tx, i) => (
                      <tr key={i} className="border-b border-purple-glow/30 hover:bg-white/5 transition-colors">
                        <td className="py-3 font-medium text-gray-200">{tx.asset}</td>
                        <td className={`py-3 font-bold ${tx.type === 'BUY' ? 'text-[#32CD32]' : tx.type === 'SELL' ? 'text-red-500' : 'text-[#9126EF]'}`}>{tx.type}</td>
                        <td className="py-3 font-mono text-gray-300">{tx.amount}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider border rounded-sm ${
                            tx.status === 'SETTLED' ? 'border-[#32CD32] text-[#32CD32] bg-[#32CD32]/10' :
                            tx.status === 'PENDING' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                            'border-[#9126EF] text-[#9126EF] bg-[#9126EF]/10'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Asset Card 5 */}
            <AssetCard name="OpenAI Convertible Note" value="$500,000" change="+2.1%" changeDir="up" allocation="2.0%" />

          </div>
        </section>
      </main>

      <footer className="w-full border-t border-purple-glow/50 py-6 mt-12 bg-[#0B0B0B]">
        <div className="max-w-[1600px] mx-auto px-6 text-center">
          <p className="font-montserrat text-xs text-[#9126EF]/50 tracking-widest uppercase">
            LIQUID © 2026 — Real-Time Data. Zero Compromise.
          </p>
        </div>
      </footer>
    </div>
  );
}

function AssetCard({ name, value, change, changeDir, allocation }: { name: string, value: string, change: string, changeDir: 'up'|'down', allocation: string }) {
  const isUp = changeDir === 'up';
  const color = isUp ? "#32CD32" : "#ef2626";
  const arrow = isUp ? "▲" : "▼";
  const allocNum = parseFloat(allocation);
  
  return (
    <div className="card-terminal p-5 flex flex-col gap-3 rounded-sm break-inside-avoid">
      <h4 className="font-montserrat font-semibold text-sm text-gray-300">{name}</h4>
      <div className="flex items-baseline justify-between">
        <span className="font-poppins font-bold text-2xl text-white">{value}</span>
        <span className="font-inter font-medium text-sm" style={{ color }}>{change} {arrow}</span>
      </div>
      <div className="flex flex-col gap-1.5 mt-2">
        <div className="flex justify-between font-inter text-[10px] text-gray-500 uppercase tracking-wider">
          <span>Allocation</span>
          <span>{allocation}</span>
        </div>
        <div className="w-full h-1 bg-[#0B0B0B] rounded-full overflow-hidden border border-purple-glow/30">
          <div className="h-full rounded-full" style={{ width: `${Math.min(allocNum * 5, 100)}%`, backgroundColor: "#9126EF" }}></div>
        </div>
      </div>
    </div>
  );
}
