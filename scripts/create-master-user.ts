import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const masterEmail = process.env.MASTER_USER_EMAIL || 'pioneirosdacolina@desbravadores.com';
const masterPassword = process.env.MASTER_USER_PASSWORD || 'pioneirosdacolina2026';
const masterName = process.env.MASTER_USER_NAME || 'Diretoria Pioneiros da Colina';

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL ou VITE_SUPABASE_URL não informado.');
}

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não informado.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  const existingAuthUser = existingUsers.users.find((item: any) => item.email?.toLowerCase() === masterEmail.toLowerCase());

  let authUserId = existingAuthUser?.id;

  if (!existingAuthUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: masterEmail,
      password: masterPassword,
      email_confirm: true
    });

    if (error) {
      throw error;
    }

    authUserId = data.user?.id;
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: authUserId,
      email: masterEmail,
      name: masterName,
      role: 'master',
      active: true,
      must_change_password: true
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    throw profileError;
  }

  console.log('Usuário mestre preparado com sucesso.');
  console.log(`Auth user: ${authUserId || '(já existente)'}`);
  console.log(`Perfil: ${masterEmail} / ${masterName}`);
}

main().catch((error) => {
  console.error('Falha ao preparar o usuário mestre:', error);
  process.exitCode = 1;
});
