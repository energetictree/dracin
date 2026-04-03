// Version: 2026.03.23-1
import { useState, useRef, useEffect } from 'react';
import { Terminal, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { clearSession } from '@/config/auth';
import { clearHistory as clearWatchHistory, getWatchHistory } from '@/lib/history';
import { clearClientCache, clearServerCache } from '@/services/dramaApiCached';

interface TerminalPanelProps {
  output: string[];
  isMobile?: boolean;
  forceExpanded?: boolean;
  onClose?: () => void;
}

export function TerminalPanel({ output, isMobile = false, forceExpanded, onClose }: TerminalPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isTerminalOpen = forceExpanded !== undefined ? forceExpanded : isExpanded;
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output, history, isExpanded]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      setHistory(prev => [...prev, `> ${command}`]);
      
      const cmd = command.toLowerCase().trim();
      console.log("[DEBUG] Command received:", JSON.stringify(command), "Processed:", JSON.stringify(cmd));
      
      // Handle pending confirmation
      if (pendingCommand === 'clearhist') {
        if (cmd === 'y' || cmd === 'yes') {
          clearWatchHistory();
          setHistory(prev => [...prev, 
            '[OK] Watch history cleared successfully',
            `${getWatchHistory().length} items in history`
          ]);
        } else if (cmd === 'n' || cmd === 'no') {
          setHistory(prev => [...prev, '[CANCELLED] Watch history not cleared']);
        } else {
          setHistory(prev => [...prev, 
            'Please answer: yes/y or no/n',
            'Are you sure? (yes/no): '
          ]);
          setCommand('');
          return;
        }
        setPendingCommand(null);
        setCommand('');
        return;
      }
      
      // Simple command processing
      if (cmd === 'help') {
        setHistory(prev => [...prev, 
          'AVAILABLE COMMANDS:',
          '  help                 | Show this help message',
          '  clear                | Clear terminal history',
          '  clearcache -s        | Clear server-side cache',
          '  clearcache -l        | Clear local cache',
          '  clearhist            | Clear watch history (keeps cache)',
          '  latest               | Open latest dramas window',
          '  trending             | Open trending dramas window',
          '  foryou               | Open for you window',
          '  vip                  | Open VIP window',
          '  status               | Show system status',
          '  about                | Show version info',
          '  logout               | Logout and clear session',
          '  exit                 | Same as logout'
        ]);
      } else if (cmd === 'clear') {
        setHistory([]);
      } else if (cmd === 'clearcache --server' || cmd === 'clearcache -s') {
        setHistory(prev => [...prev, '[WORKING] Clearing server cache...']);
        clearServerCache().then(result => {
          if (result.success) {
            setHistory(prev => [...prev, 
              `[OK] ${result.message}`,
              result.clearedKeys !== undefined ? `    Keys removed: ${result.clearedKeys}` : ''
            ]);
          } else {
            setHistory(prev => [...prev, `[ERROR] ${result.message}`]);
          }
        });
      } else if (cmd === 'clearcache --local' || cmd === 'clearcache -l') {
        setHistory(prev => [...prev, '[WORKING] Clearing local cache...']);
        clearClientCache().then(result => {
          if (result.success) {
            setHistory(prev => [...prev, `[OK] ${result.message}`]);
          } else {
            setHistory(prev => [...prev, `[ERROR] ${result.message}`]);
          }
        });
      } else if (cmd === 'clearcache') {
        setHistory(prev => [...prev, 
          'ERROR: Missing flag for clearcache command',
          'Usage: clearcache -s  or  clearcache -l',
          '       clearcache --server  or  clearcache --local'
        ]);
      } else if (cmd === 'clearhist') {
        const historyCount = getWatchHistory().length;
        if (historyCount === 0) {
          setHistory(prev => [...prev, '[INFO] Watch history is already empty']);
        } else {
          setHistory(prev => [...prev, 
            `WARNING: This will clear ${historyCount} item(s) from your watch history.`,
            'Are you sure? (yes/no): '
          ]);
          setPendingCommand('clearhist');
        }
      } else if (cmd === 'status') {
        setHistory(prev => [...prev,
          'SYSTEM STATUS:',
          `  Memory: ${Math.round(Math.random() * 30 + 40)}MB / 128MB`,
          `  CPU: ${Math.round(Math.random() * 20 + 5)}%`,
          `  Uptime: ${Math.round(Math.random() * 24)}h ${Math.round(Math.random() * 60)}m`,
          '  Connection: ONLINE',
          '  API Status: CONNECTED',
          `  Watch History: ${getWatchHistory().length} item(s)`,
          '',
          'CACHE STATUS:',
          '  Client Cache: IndexedDB (local)',
          '  Server Cache: NodeCache (dracin-proxy)',
          '  Cache TTL: 3 hours'
        ]);
      } else if (cmd === 'about') {
        setHistory(prev => [...prev,
          'DRACIN TERMINAL v1.0.0',
          'Build: 2026.02.03',
          'Author: Eligible Enterprise',
          'License: MIT',
          '',
          'Powered by Sansekai API'
        ]);
      } else if (['latest', 'trending', 'foryou', 'vip'].includes(cmd)) {
        setHistory(prev => [...prev, `Executing: OPEN_${cmd.toUpperCase()}.EXE...`]);
      } else if (cmd === 'logout' || cmd === 'exit') {
        setHistory(prev => [...prev, 
          'LOGGING OUT...',
          'Clearing session data...',
          '[OK] Session terminated'
        ]);
        setTimeout(() => {
          clearSession();
          window.location.reload();
        }, 1000);
      } else {
        setHistory(prev => [...prev, `ERROR: Unknown command "${command}"`]);
      }
      
      setCommand('');
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  // Mobile version - compact floating terminal
  if (isMobile) {
    return (
      <>
        {/* Floating Terminal Button - Hidden, now accessed via hamburger menu */}
        {/* {!isTerminalOpen && (
          <button
            className="fixed bottom-20 right-3 w-12 h-12 bg-green-600 border-2 border-green-400 rounded-full flex items-center justify-center shadow-lg z-40"
            onClick={() => setIsExpanded(true)}
          >
            <Terminal className="w-5 h-5 text-black" />
          </button>
        )} */}

        {/* Expanded Terminal Modal */}
        {isTerminalOpen && (
          <div className="fixed inset-x-2 bottom-20 top-20 bg-black border-2 border-green-600 z-50 flex flex-col">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-green-900/30 border-b border-green-700">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-xs font-bold">TERMINAL</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="text-green-600 hover:text-green-400 p-1"
                  onClick={clearHistory}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  className="text-green-400 p-1"
                  onClick={() => {
                    setIsExpanded(false);
                    onClose?.();
                  }}
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Output Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-auto p-3 font-mono text-xs retro-scroll"
            >
              <div className="text-green-600 mb-2 text-[10px]">
                {'╔══════════════════════════════════════╗'}
              </div>
              <div className="text-green-600 mb-2 text-[10px]">
                {'║  Type \'help\' for available commands  ║'}
              </div>
              <div className="text-green-600 mb-4 text-[10px]">
                {'╚══════════════════════════════════════╝'}
              </div>
              
              {output.map((log, i) => (
                <div key={`sys-${i}`} className="text-green-500 mb-1 text-xs">
                  <span className="text-green-700">{log}</span>
                </div>
              ))}
              
              {history.map((line, i) => (
                <div key={`hist-${i}`} className={`mb-1 text-xs ${
                  line.startsWith('>') ? 'text-yellow-400' : 
                  line.startsWith('ERROR') ? 'text-red-500' :
                  line.startsWith('SYSTEM') || line.startsWith('DRACIN') ? 'text-cyan-400' :
                  'text-green-300'
                }`}>
                  {line}
                </div>
              ))}
              
              <div className="text-green-400 mt-2">
                <span className="animate-pulse">{'>'}</span>
              </div>
            </div>

            {/* Command Input */}
            <form onSubmit={handleCommand} className="flex items-center gap-2 p-2 border-t border-green-700">
              <span className="text-green-500 font-bold text-sm">{'>'}</span>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Command..."
                className="flex-1 bg-transparent border-none outline-none text-green-400 font-mono text-sm placeholder-green-800"
                autoFocus
              />
            </form>
          </div>
        )}
      </>
    );
  }

  // Desktop version (original)
  return (
    <div 
      className={`bg-black border-t-2 border-green-600 transition-all duration-300 ${
        isExpanded ? 'h-64' : 'h-10'
      }`}
    >
      {/* Terminal Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-green-900/30 cursor-pointer hover:bg-green-900/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-bold">SYSTEM_CONSOLE.EXE</span>
          <span className="text-green-600 text-xs">- {output.length + history.length} messages</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="text-green-600 hover:text-green-400"
            onClick={(e) => { e.stopPropagation(); clearHistory(); }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-green-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-green-400" />
          )}
        </div>
      </div>

      {/* Terminal Content */}
      {isExpanded && (
        <div className="h-[calc(100%-40px)] flex flex-col">
          {/* Output Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-auto p-3 font-mono text-sm retro-scroll"
          >
            {/* Welcome Message */}
            <div className="text-green-600 mb-2">
              {`╔══════════════════════════════════════════════════════════════╗`}
            </div>
            <div className="text-green-600 mb-2">
              {`║     DRACIN TERMINAL v1.0 - Type 'help' for commands          ║`}
            </div>
            <div className="text-green-600 mb-4">
              {`╚══════════════════════════════════════════════════════════════╝`}
            </div>
            
            {/* System Logs */}
            {output.map((log, i) => (
              <div key={`sys-${i}`} className="text-green-500 mb-1">
                <span className="text-green-700">{log}</span>
              </div>
            ))}
            
            {/* User Commands */}
            {history.map((line, i) => (
              <div key={`hist-${i}`} className={`mb-1 ${
                line.startsWith('>') ? 'text-yellow-400' : 
                line.startsWith('ERROR') ? 'text-red-500' :
                line.startsWith('SYSTEM') || line.startsWith('DRACIN') ? 'text-cyan-400' :
                'text-green-300'
              }`}>
                {line}
              </div>
            ))}
            
            {/* Blinking Cursor */}
            <div className="text-green-400 cursor-blink mt-2" />
          </div>

          {/* Command Input */}
          <form onSubmit={handleCommand} className="flex items-center gap-2 p-2 border-t border-green-800">
            <span className="text-green-500 font-bold">{'>'}</span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command..."
              className="flex-1 bg-transparent border-none outline-none text-green-400 font-mono placeholder-green-800"
              autoFocus
            />
          </form>
        </div>
      )}
    </div>
  );
}
