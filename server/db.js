import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Usuarios oficiales del sistema
const defaultUsers = [
  {
    id: 'usr-jherson',
    name: 'Jherson',
    username: 'jherson',
    email: 'jherson@empresa.com',
    password: 'GRANlagarto123',
    role: 'ADMIN',
    roleTitle: 'Administrador',
    area: 'Área Informática Operacional',
    avatarColor: '#3b82f6',
  },
  {
    id: 'usr-ludwing',
    name: 'Ludwing',
    username: 'ludwing',
    email: 'ludwing@empresa.com',
    password: '123456',
    role: 'ADMIN',
    roleTitle: 'Analista',
    area: 'Área Informática Operacional',
    avatarColor: '#10b981',
  },
  {
    id: 'usr-lucero',
    name: 'Lucero',
    username: 'lucero',
    email: 'lucero@empresa.com',
    password: 'Chauca2026',
    role: 'PARTICIPANT',
    roleTitle: 'Auxiliar',
    area: 'Operaciones',
    avatarColor: '#ec4899',
  },
  {
    id: 'usr-kathy',
    name: 'Kathy',
    username: 'kathy',
    email: 'kathy@empresa.com',
    password: '123456',
    role: 'PARTICIPANT',
    roleTitle: 'Asistente',
    area: 'Operaciones',
    avatarColor: '#8b5cf6',
  },
  {
    id: 'usr-edgar',
    name: 'Edgar',
    username: 'edgar',
    email: 'edgar@empresa.com',
    password: '123456',
    role: 'VIEWER',
    roleTitle: 'Observador (Solo Lectura)',
    area: 'Supervisión',
    avatarColor: '#f59e0b',
  },
  {
    id: 'usr-lorena',
    name: 'Lorena',
    username: 'lorena',
    email: 'lorena@empresa.com',
    password: '123456',
    role: 'VIEWER',
    roleTitle: 'Observadora (Solo Lectura)',
    area: 'Supervisión',
    avatarColor: '#06b6d4',
  },
];

const getEmptyState = () => ({
  users: defaultUsers,
  currentUserId: 'usr-jherson',
  processes: [],
  responsibilities: [],
  occurrences: [],
  deliverables: [],
  deliverableUpdates: [],
  projects: [],
  projectMilestones: [],
  projectTasks: [],
  projectPhases: [],
  ideas: [],
  logbook: [],
  meetings: [],
  chatMessages: [],
});

class DatabaseManager {
  constructor() {
    this.cachedState = null;
    this.pgPool = null;
    this.isSyncing = false;
    this.syncScheduled = false;

    this.ensureDirectoryExists();
    this.initLocal();
    this.initPostgres();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  initLocal() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.cachedState = this.normalizeState(JSON.parse(raw));
      } else {
        this.cachedState = getEmptyState();
        this.persistLocal();
      }
    } catch (err) {
      console.error('Error al cargar la base de datos local:', err);
      this.cachedState = getEmptyState();
      this.persistLocal();
    }
  }

  initPostgres() {
    const connStr = process.env.DATABASE_URL;
    if (!connStr) {
      console.log('ℹ️ Modo local: No se detectó DATABASE_URL.');
      return;
    }

    try {
      this.pgPool = new pg.Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 7000,
      });

      // Sincronización inicial con Supabase en segundo plano
      this.syncFromCloud();
    } catch (err) {
      console.warn('⚠️ No se pudo inicializar la conexión con Supabase:', err.message);
    }
  }

  async syncFromCloud() {
    if (!this.pgPool) return;
    try {
      const client = await this.pgPool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS control_gestion_state (
            key VARCHAR(50) PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);

        const res = await client.query(
          `SELECT data, updated_at FROM control_gestion_state WHERE key = 'current_state';`
        );

        if (res.rows.length > 0 && res.rows[0].data) {
          this.cachedState = this.normalizeState(res.rows[0].data);
          this.persistLocal();
          console.log(`✅ [Supabase] Estado sincronizado desde la nube (${new Date(res.rows[0].updated_at).toLocaleString()})`);
        } else {
          // Si la nube está vacía, subir el estado local
          await client.query(
            `INSERT INTO control_gestion_state (key, data, updated_at) VALUES ('current_state', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
            [this.cachedState]
          );
          console.log('☁️ [Supabase] Estado local subido a la nube por primera vez.');
        }
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn('⚠️ [Supabase] Aviso de sincronización desde la nube:', err.message);
    }
  }

  async syncToCloud() {
    if (!this.pgPool) return;
    if (this.isSyncing) {
      this.syncScheduled = true;
      return;
    }

    this.isSyncing = true;
    try {
      const client = await this.pgPool.connect();
      try {
        await client.query(
          `INSERT INTO control_gestion_state (key, data, updated_at)
           VALUES ('current_state', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
          [this.cachedState]
        );
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn('⚠️ [Supabase] No se pudo sincronizar cambio a la nube:', err.message);
    } finally {
      this.isSyncing = false;
      if (this.syncScheduled) {
        this.syncScheduled = false;
        this.syncToCloud();
      }
    }
  }

  normalizeState(raw) {
    const empty = getEmptyState();
    return {
      users: defaultUsers.map((def) => {
        const found = Array.isArray(raw?.users)
          ? raw.users.find(
              (u) =>
                u.id === def.id ||
                (def.id === 'usr-lucero' && (u.id === 'usr-katha' || u.name?.toLowerCase() === 'katha')) ||
                (def.id === 'usr-ludwing' && (u.id === 'usr-ludwin' || u.name?.toLowerCase() === 'ludwin')) ||
                (u.username && u.username.toLowerCase() === def.username.toLowerCase()) ||
                (u.name && u.name.toLowerCase() === def.name.toLowerCase())
            )
          : null;
        return {
          ...(found || {}),
          ...def, // def prevalece siempre sobre cualquier dato antiguo
          password: def.password,
        };
      }),
      currentUserId: raw?.currentUserId || empty.currentUserId,
      processes: Array.isArray(raw?.processes) ? raw.processes : [],
      responsibilities: Array.isArray(raw?.responsibilities) ? raw.responsibilities : [],
      occurrences: Array.isArray(raw?.occurrences) ? raw.occurrences : [],
      deliverables: Array.isArray(raw?.deliverables) ? raw.deliverables : [],
      deliverableUpdates: Array.isArray(raw?.deliverableUpdates) ? raw.deliverableUpdates : [],
      projects: Array.isArray(raw?.projects) ? raw.projects : [],
      projectMilestones: Array.isArray(raw?.projectMilestones) ? raw.projectMilestones : [],
      projectTasks: Array.isArray(raw?.projectTasks) ? raw.projectTasks : [],
      projectPhases: Array.isArray(raw?.projectPhases) ? raw.projectPhases : [],
      ideas: Array.isArray(raw?.ideas) ? raw.ideas : [],
      logbook: Array.isArray(raw?.logbook) ? raw.logbook : [],
      meetings: Array.isArray(raw?.meetings) ? raw.meetings : [],
      chatMessages: Array.isArray(raw?.chatMessages) ? raw.chatMessages : [],
    };
  }

  persistLocal() {
    try {
      const serialized = JSON.stringify(this.cachedState, null, 2);
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, serialized, 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
      return true;
    } catch (err) {
      console.error('Error al persistir en archivo local:', err);
      return false;
    }
  }

  persist() {
    const localSaved = this.persistLocal();
    // Guardar asíncronamente en Supabase sin bloquear
    this.syncToCloud();
    return localSaved;
  }

  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(BACKUP_DIR, `database_backup_${timestamp}.json`);
      fs.copyFileSync(DB_FILE, backupFile);
      return backupFile;
    } catch (err) {
      console.error('Error al crear backup:', err);
      return null;
    }
  }

  getState() {
    if (!this.cachedState) {
      this.initLocal();
    }
    return this.cachedState;
  }

  saveState(newState) {
    this.cachedState = this.normalizeState(newState);
    this.persist();
    return this.cachedState;
  }

  getEntity(entityKey) {
    const state = this.getState();
    return state[entityKey] || [];
  }

  createItem(entityKey, item) {
    const state = this.getState();
    if (!Array.isArray(state[entityKey])) {
      state[entityKey] = [];
    }
    state[entityKey].push(item);
    this.persist();
    return item;
  }

  updateItem(entityKey, id, patch) {
    const state = this.getState();
    if (!Array.isArray(state[entityKey])) return null;
    const index = state[entityKey].findIndex((i) => i.id === id);
    if (index === -1) return null;

    state[entityKey][index] = { ...state[entityKey][index], ...patch };
    this.persist();
    return state[entityKey][index];
  }

  deleteItem(entityKey, id) {
    const state = this.getState();
    if (!Array.isArray(state[entityKey])) return false;
    const initialLen = state[entityKey].length;
    state[entityKey] = state[entityKey].filter((i) => i.id !== id);
    if (state[entityKey].length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  authenticateUser(usernameOrEmail, password) {
    const state = this.getState();
    const query = String(usernameOrEmail || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    const user = (state.users || defaultUsers).find((u) => {
      const matchName = String(u.name || '').trim().toLowerCase() === query;
      const matchUsername = String(u.username || '').trim().toLowerCase() === query;
      const matchEmail = String(u.email || '').trim().toLowerCase() === query;
      const matchAlias =
        (query === 'katha' && (u.id === 'usr-lucero' || u.id === 'usr-katha' || u.name.toLowerCase() === 'lucero')) ||
        (query === 'ludwin' && (u.id === 'usr-ludwing' || u.id === 'usr-ludwin' || u.name.toLowerCase() === 'ludwing'));
      return matchName || matchUsername || matchEmail || matchAlias;
    });

    if (!user) return null;

    // Obtener la contraseña esperada (priorizar user.password, con respaldo obligatorio en defaultUsers)
    const defaultMatch = defaultUsers.find(
      (d) =>
        d.id === user.id ||
        (user.id === 'usr-lucero' && d.id === 'usr-lucero') ||
        (user.id === 'usr-katha' && d.id === 'usr-lucero') ||
        (user.id === 'usr-ludwing' && d.id === 'usr-ludwing') ||
        (user.id === 'usr-ludwin' && d.id === 'usr-ludwing') ||
        d.username.toLowerCase() === String(user.username || '').toLowerCase() ||
        d.name.toLowerCase() === String(user.name || '').toLowerCase()
    );
    const expectedPassword = String(user.password || defaultMatch?.password || '').trim();

    if (!expectedPassword || expectedPassword !== cleanPassword) {
      return null;
    }

    const { password: _, ...safeUser } = user;
    return safeUser;
  }
}

export const db = new DatabaseManager();
