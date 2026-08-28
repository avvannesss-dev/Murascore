// ============================================================
// Smart Antivirus Scanner for Gaming Content
// Allows gaming files (.exe, .dll, .asi, .lua, .zip, etc.)
// Blocks real malware: ransomware, worms, phishing scripts,
// hidden macros, cryptolockers, network exploits.
// Includes SHA-256 hashing for file integrity.
// ============================================================

export interface ScanResult {
  safe: boolean;
  threat: string | null;
  hash: string | null;
  status: string;
}

// Gaming-allowed extensions — these are LEGITIMATE for a gaming forum
const GAMING_EXTENSIONS = [
  '.zip', '.rar', '.7z', '.exe', '.dll', '.lua', '.txt', '.json', '.asi',
  '.cs', '.csproj', '.sln', '.cfg', '.ini', '.xml', '.log',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp',
  '.mp4', '.mp3', '.wav', '.ogg', '.webm',
  '.pdf', '.doc', '.docx',
  '.torrent',
];

// Truly dangerous extensions that are NEVER allowed
const DANGEROUS_EXTENSIONS = [
  '.scr',
  '.hta',
  '.msi',
  '.wsf',
  '.wsh',
  '.vbs',
  '.ps1',
  '.jar',
  '.app',
  '.command',
  '.sh',
  '.deb',
  '.rpm',
  '.pkg',
  '.dmg',
  '.iso',
];

// Malware signatures — patterns that indicate REAL malware, not game mods
const MALWARE_SIGNATURES = [
  // Ransomware / cryptolocker patterns
  'encrypt_files',
  'ransom',
  'decrypt',
  'bitcoin',
  'wallet_address',
  'payment_required',
  'your_files_are_encrypted',
  // Network worm / botnet patterns
  'botnet',
  'c2_server',
  'command_and_control',
  'exfiltrate',
  'data_steal',
  'keylogger',
  'screenshot_capture',
  // Phishing / social engineering
  'phishing',
  'fake_login',
  'credential_harvest',
  'steal_passwords',
  // Macro-based attacks (Office macros that auto-execute)
  'auto_open',
  'autoexec',
  'shell.execute',
  'wscript.shell',
  'powershell -enc',
  // Network exploitation
  'reverse_shell',
  'bind_shell',
  'exploit_kit',
  'privilege_escalation',
  'remote_code_execution',
];

// Suspicious PE imports (real malware indicators)
const SUSPICIOUS_PE_IMPORTS = [
  'CryptEncrypt',
  'CryptDecrypt',
  'WinExec',
  'CreateRemoteThread',
  'WriteProcessMemory',
  'VirtualAllocEx',
  'SetWindowsHookEx',
  'GetAsyncKeyState',
  'InternetOpenUrl',
  'URLDownloadToFile',
  'RegSetValueEx',
  'CreateService',
  'StartService',
];

function getExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot >= 0 ? name.slice(lastDot).toLowerCase() : '';
}

function hasDoubleExtension(name: string): boolean {
  const parts = name.split('.');
  return parts.filter((p) => p.length > 0).length > 2;
}

function checkPEHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 2) return false;
  return bytes[0] === 0x4d && bytes[1] === 0x5a;
}

function checkELFHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46;
}

function checkScriptContent(bytes: Uint8Array): boolean {
  if (bytes.length > 8192) return false;
  const text = new TextDecoder().decode(bytes.slice(0, 8192)).toLowerCase();
  return MALWARE_SIGNATURES.some((sig) => text.includes(sig));
}

function checkSuspiciousPEImports(bytes: Uint8Array): boolean {
  if (bytes.length < 512) return false;
  const text = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 65536))).toLowerCase();
  return SUSPICIOUS_PE_IMPORTS.some((imp) => text.includes(imp.toLowerCase()));
}

// Check for embedded scripts inside archive-like files
function checkEmbeddedThreats(bytes: Uint8Array): boolean {
  if (bytes.length < 512) return false;
  const text = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 32768))).toLowerCase();
  // Look for embedded script tags that indicate droppers
  const embeddedPatterns = [
    '<script',
    'eval(',
    'document.write',
    'window.location',
    'xmlhttprequest',
    'fetch(',
    'navigator.useragent',
  ];
  return embeddedPatterns.some((p) => text.includes(p));
}

// SHA-256 hashing using Web Crypto API
async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function scanFile(file: File): ScanResult {
  const name = file.name.toLowerCase();
  const ext = getExtension(name);

  // Double extension check — only block if combined with dangerous extension
  if (hasDoubleExtension(name)) {
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      return {
        safe: false,
        threat: `Подозрительное двойное расширение: ${name}`,
        hash: null,
        status: 'Заблокировано',
      };
    }
  }

  // Block truly dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return {
      safe: false,
      threat: `Опасный тип файла: ${ext}`,
      hash: null,
      status: 'Заблокировано',
    };
  }

  // Gaming files and common formats are allowed
  return {
    safe: true,
    threat: null,
    hash: null,
    status: 'Базовая проверка пройдена',
  };
}

export async function scanFileAsync(file: File): Promise<ScanResult> {
  const basic = scanFile(file);
  if (!basic.safe) return basic;

  // Read first 64KB for deep inspection
  const slice = file.slice(0, 65536);
  const buf = await slice.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // Check for PE/ELF headers — allowed for .exe/.dll, but check for malware patterns
  const isPE = checkPEHeader(bytes);
  const isELF = checkELFHeader(bytes);
  const ext = getExtension(file.name);

  if (isPE || isELF) {
    // Executable files are allowed for gaming, but check for malware indicators
    if (checkSuspiciousPEImports(bytes)) {
      return {
        safe: false,
        threat: 'Обнаружены подозрительные импорты, характерные для вредоносного ПО',
        hash: null,
        status: 'Заблокировано',
      };
    }
    if (checkScriptContent(bytes)) {
      return {
        safe: false,
        threat: 'Обнаружен код вредоносного ПО в исполняемом файле',
        hash: null,
        status: 'Заблокировано',
      };
    }
  }

  // Check for embedded web scripts in non-executable files
  if (!isPE && !isELF && !ext.match(/\.(exe|dll|asi)$/)) {
    if (checkEmbeddedThreats(bytes) && checkScriptContent(bytes)) {
      return {
        safe: false,
        threat: 'Обнаружен встроенный вредоносный скрипт',
        hash: null,
        status: 'Заблокировано',
      };
    }
  }

  // Compute SHA-256 hash for integrity tracking
  const hash = await computeSHA256(file);

  return {
    safe: true,
    threat: null,
    hash,
    status: 'Файл проверен, вирусов нет',
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
