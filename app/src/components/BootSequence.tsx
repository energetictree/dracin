import { useState, useEffect, useRef } from 'react';
import { useMobile } from '@/hooks/useMobile';
import { verifyPassword, createSession, saveSession } from '@/config/auth';
import { HackerTransition } from './HackerTransition';

interface BootSequenceProps {
  onLogin: (username: string) => void;
}

export function BootSequence({ onLogin }: BootSequenceProps) {
  const { isMobile } = useMobile();
  
  return isMobile ? <MobileBootSequence onLogin={onLogin} /> : <DesktopBootSequence onLogin={onLogin} />;
}

// Desktop boot sequence with full ASCII art
function DesktopBootSequence({ onLogin }: BootSequenceProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [bootComplete, setBootComplete] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginStep, setLoginStep] = useState<'username' | 'password' | 'error'>('username');
  const [error, setError] = useState('');
  const [showTransition, setShowTransition] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bootLines = [
    '',
    '    ██████╗ ██████╗  █████╗ ███╗   ███╗ █████╗ ██████╗  ██████╗ ██╗  ██╗',
    '    ██╔══██╗██╔══██╗██╔══██╗████╗ ████║██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝',
    '    ██║  ██║██████╔╝███████║██╔████╔██║███████║██████╔╝██║   ██║ ╚███╔╝ ',
    '    ██║  ██║██╔══██╗██╔══██║██║╚██╔╝██║██╔══██║██╔══██╗██║   ██║ ██╔██╗ ',
    '    ██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║██║  ██║██████╔╝╚██████╔╝██╔╝ ██╗',
    '    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝',
    '',
    '                    TERMINAL EDITION v1.0.0',
    '',
    '═══════════════════════════════════════════════════════════════════════════',
    '',
    'BIOS Date: 02/03/26 14:22:51',
    'CPU: 80486 DX2-66',
    'Base Memory: 640K',
    'Extended Memory: 31744K',
    '',
    'Detecting Primary Master ... DRACIN HDD',
    'Detecting Primary Slave  ... NONE',
    'Detecting Secondary Master ... CD-ROM',
    'Detecting Secondary Slave  ... NONE',
    '',
    'Loading operating system...',
    '...',
    '...',
    'KERNEL LOADED SUCCESSFULLY',
    '',
    'Initializing API connection...',
    '  [OK] Network module loaded',
    '  [OK] HTTP client initialized',
    '  [OK] Dracin API connected',
    '',
    'Loading modules...',
    '  [OK] DramaCard.module',
    '  [OK] WindowManager.module',
    '  [OK] TerminalPanel.module',
    '  [OK] SearchEngine.module',
    '  [OK] VideoPlayer.module',
    '',
    'Mounting virtual file system...',
    '  /latest   - mounted',
    '  /trending - mounted',
    '  /foryou   - mounted',
    '  /vip      - mounted',
    '  /search   - mounted',
    '',
    'System initialization complete.',
    '',
    'SECURITY LOGIN REQUIRED',
    ''
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentLine < bootLines.length) {
        setLines(prev => [...prev, bootLines[currentLine]]);
        setCurrentLine(prev => prev + 1);
      } else if (!bootComplete) {
        setBootComplete(true);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [currentLine, bootLines.length, bootComplete]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [lines]);

  // Focus input when login step changes
  useEffect(() => {
    if (bootComplete && inputRef.current) {
      inputRef.current.focus();
    }
  }, [bootComplete, loginStep]);

  const handlePasswordSubmit = () => {
    if (verifyPassword(password)) {
      // Show hacker transition before completing login
      setShowTransition(true);
    } else {
      setError('ACCESS DENIED: Invalid password');
      setPassword('');
      setLoginStep('error');
      setTimeout(() => {
        setLoginStep('password');
        setError('');
      }, 1500);
    }
  };

  const handleTransitionComplete = () => {
    const session = createSession(username.trim());
    saveSession(session);
    onLogin(username.trim());
  };

  // Show transition animation
  if (showTransition) {
    return (
      <HackerTransition 
        username={username} 
        onComplete={handleTransitionComplete} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8 crt-screen">
      <div ref={containerRef} className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <pre className="text-green-400 font-mono text-sm md:text-base leading-relaxed">
          {lines.map((line, index) => (
            <div key={index} className={`
              ${line.includes('[OK]') ? 'text-green-400' : ''}
              ${line.includes('ERROR') ? 'text-red-500' : ''}
              ${line.includes('BIOS') || line.includes('CPU') || line.includes('Memory') ? 'text-cyan-400' : ''}
              ${line.startsWith('    █') ? 'text-green-500 font-bold' : ''}
              ${line.includes('TERMINAL EDITION') ? 'text-yellow-400' : ''}
              ${line.includes('SECURITY') ? 'text-red-400 font-bold' : ''}
            `}>
              {line || ' '}
            </div>
          ))}
          
          {/* Blank lines to push login to middle */}
          {bootComplete && (
            <>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
            </>
          )}
          
          {/* Login Prompts - Pure text, no boxes */}
          {bootComplete && loginStep === 'username' && (
            <div className="mt-4">
              <div className="text-yellow-400">{'>'} ENTER USERNAME:</div>
              <div className="flex items-center mt-2">
                <span className="text-green-400 mr-2">{'>'}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && username.trim()) {
                      setLoginStep('password');
                      setError('');
                    }
                  }}
                  className="bg-transparent border-0 border-b border-green-400/30 outline-none text-green-400 font-mono text-sm md:text-base flex-1 p-0 m-0 rounded-none shadow-none focus:border-green-400 focus:ring-0"
                  style={{ 
                    background: 'transparent',
                    boxShadow: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                  autoFocus
                />
                <span className={`inline-block w-3 h-5 bg-green-400 ml-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
              </div>
            </div>
          )}
          
          {bootComplete && loginStep === 'password' && (
            <div className="mt-4">
              <div className="text-yellow-400">{'>'} ENTER PASSWORD:</div>
              <div className="flex items-center mt-2">
                <span className="text-green-400 mr-2">{'>'}</span>
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordSubmit();
                    }
                  }}
                  className="bg-transparent border-0 border-b border-green-400/30 outline-none text-green-400 font-mono text-sm md:text-base flex-1 p-0 m-0 rounded-none shadow-none focus:border-green-400 focus:ring-0"
                  style={{ 
                    background: 'transparent',
                    boxShadow: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                  autoFocus
                />
                <span className={`inline-block w-3 h-5 bg-green-400 ml-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4 text-red-500 font-bold">
              {error}
            </div>
          )}
          
          <div ref={scrollRef} />
        </pre>
        
        {/* Progress Bar */}
        {!bootComplete && (
          <div className="mt-8 flex items-center gap-4">
            <span className="text-green-600 text-sm">LOADING:</span>
            <div className="flex-1 h-6 border-2 border-green-600 p-1">
              <div 
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${(currentLine / bootLines.length) * 100}%` }}
              />
            </div>
            <span className="text-green-400 text-sm w-12 text-right">
              {Math.round((currentLine / bootLines.length) * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile boot sequence
function MobileBootSequence({ onLogin }: BootSequenceProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [bootComplete, setBootComplete] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginStep, setLoginStep] = useState<'username' | 'password' | 'error'>('username');
  const [error, setError] = useState('');
  const [showTransition, setShowTransition] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bootLines = [
    '',
    '    ██████╗ █████╗  ██████╗',
    '    ██╔══██╗██╔══██╗██╔════╝',
    '    ██║  ██║███████║██║     ',
    '    ██║  ██║██╔══██║██║     ',
    '    ██████╔╝██║  ██║╚██████╗',
    '    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝',
    '',
    '         DRC v1.0.0',
    '',
    '═══════════════════════════════════════',
    '',
    'BIOS Date: 02/03/26 14:22:51',
    'CPU: 80486 DX2-66',
    'Base Memory: 640K',
    'Extended Memory: 31744K',
    '',
    'Detecting Primary Master ... DRACIN HDD',
    'Detecting Primary Slave  ... NONE',
    'Detecting Secondary Master ... CD-ROM',
    'Detecting Secondary Slave  ... NONE',
    '',
    'Loading OS...',
    'KERNEL LOADED',
    '',
    'Initializing API...',
    '  [OK] Network ready',
    '  [OK] HTTP client ready',
    '  [OK] API connected',
    '',
    'Loading modules...',
    '  [OK] Modules loaded',
    '',
    'Mounting VFS...',
    '  /latest /trending /foryou',
    '  /vip /search',
    '',
    'System ready.',
    '',
    'SECURITY LOGIN REQUIRED',
    ''
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentLine < bootLines.length) {
        setLines(prev => [...prev, bootLines[currentLine]]);
        setCurrentLine(prev => prev + 1);
      } else if (!bootComplete) {
        setBootComplete(true);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [currentLine, bootLines.length, bootComplete]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [lines]);

  // Focus input when login step changes
  useEffect(() => {
    if (bootComplete && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [bootComplete, loginStep]);

  const handlePasswordSubmit = () => {
    if (verifyPassword(password)) {
      setShowTransition(true);
    } else {
      setError('ACCESS DENIED');
      setPassword('');
      setLoginStep('error');
      setTimeout(() => {
        setLoginStep('password');
        setError('');
      }, 1500);
    }
  };

  const handleTransitionComplete = () => {
    const session = createSession(username.trim());
    saveSession(session);
    onLogin(username.trim());
  };

  // Show transition animation
  if (showTransition) {
    return (
      <HackerTransition 
        username={username} 
        onComplete={handleTransitionComplete} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col p-4 crt-screen overflow-hidden">
      {/* Full scrolling boot log */}
      <div ref={containerRef} className="flex-1 w-full max-w-md mx-auto overflow-y-auto font-mono text-xs">
        <pre className="text-green-400 leading-relaxed whitespace-pre-wrap">
          {lines.map((line, index) => (
            <div key={index} className={`
              ${line.includes('[OK]') ? 'text-green-400' : ''}
              ${line.includes('ERROR') ? 'text-red-500' : ''}
              ${line.includes('BIOS') || line.includes('CPU') || line.includes('Memory') ? 'text-cyan-400' : ''}
              ${line.startsWith('    █') ? 'text-green-500 font-bold' : ''}
              ${line.includes('SECURITY') ? 'text-red-400 font-bold' : ''}
            `}>
              {line || ' '}
            </div>
          ))}
          
          {/* Blank lines to push login to middle */}
          {bootComplete && (
            <>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
              <div>{' '}</div>
            </>
          )}
          
          {/* Login Prompts - Pure text, no boxes */}
          {bootComplete && loginStep === 'username' && (
            <div className="mt-4">
              <div className="text-yellow-400 text-xs">{'>'} USERNAME:</div>
              <div className="flex items-center mt-1">
                <span className="text-green-400 mr-1 text-xs">{'>'}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && username.trim()) {
                      setLoginStep('password');
                      setError('');
                    }
                  }}
                  className="bg-transparent border-0 border-b border-green-400/30 outline-none text-green-400 font-mono text-xs flex-1 p-0 m-0 rounded-none shadow-none focus:border-green-400 focus:ring-0"
                  style={{ 
                    background: 'transparent',
                    boxShadow: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                  autoFocus
                />
                <span className={`inline-block w-2 h-4 bg-green-400 ml-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
              </div>
            </div>
          )}
          
          {bootComplete && loginStep === 'password' && (
            <div className="mt-4">
              <div className="text-yellow-400 text-xs">{'>'} PASSWORD:</div>
              <div className="flex items-center mt-1">
                <span className="text-green-400 mr-1 text-xs">{'>'}</span>
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordSubmit();
                    }
                  }}
                  className="bg-transparent border-0 border-b border-green-400/30 outline-none text-green-400 font-mono text-xs flex-1 p-0 m-0 rounded-none shadow-none focus:border-green-400 focus:ring-0"
                  style={{ 
                    background: 'transparent',
                    boxShadow: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                  autoFocus
                />
                <span className={`inline-block w-2 h-4 bg-green-400 ml-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4 text-red-500 font-bold text-xs">
              {error}
            </div>
          )}
          
          <div ref={scrollRef} />
        </pre>
      </div>

      {/* Progress Bar at bottom */}
      {!bootComplete && (
        <div className="mt-4 flex items-center gap-3 pb-4">
          <span className="text-green-600 text-xs">LOADING:</span>
          <div className="flex-1 h-5 border-2 border-green-600 p-0.5">
            <div 
              className="h-full bg-green-500 transition-all duration-100"
              style={{ width: `${(currentLine / bootLines.length) * 100}%` }}
            />
          </div>
          <span className="text-green-400 text-xs w-10 text-right">
            {Math.round((currentLine / bootLines.length) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
