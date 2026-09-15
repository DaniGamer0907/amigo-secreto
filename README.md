# Amigo Secreto

App de sorteo de amigo secreto hecha con Next.js, Supabase y una Edge Function para generar las asignaciones.

## Requisitos

- Node.js 18 o superior
- npm
- Cuenta y proyecto en Supabase
- Vercel CLI para despliegue

## Instalacion local

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env.local` desde el ejemplo:

```bash
cp .env.local.example .env.local
```

3. Configura estas variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

4. En Supabase, abre SQL Editor y ejecuta `supabase/schema.sql`.

5. Configura la variable secreta de la Edge Function `draw`:

```bash
supabase secrets set SUPABASE_DB_URL="postgresql://..."
```

6. Despliega la Edge Function:

```bash
supabase functions deploy draw
```

7. Corre la app local:

```bash
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Variables de entorno

Para Next.js:

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public key del proyecto Supabase.

Para la Edge Function de Supabase:

- `SUPABASE_DB_URL`: connection string PostgreSQL del proyecto. No debe exponerse en el cliente ni en Vercel.

## RLS

El archivo `supabase/schema.sql` activa RLS y fuerza RLS en:

- `rooms`
- `participants`
- `assignments`

`rooms` y `participants` permiten las lecturas e inserciones que necesita la sala publica. `assignments` queda protegida: el cliente no lee ni actualiza directamente esa tabla; usa los RPC `get_reveal_assignment` y `mark_assignment_revealed` con el `session_token` local.

## Despliegue en Vercel con CLI

1. Instala e inicia sesion en Vercel:

```bash
npm i -g vercel
vercel login
```

2. Vincula el proyecto:

```bash
vercel link
```

3. Configura en el dashboard de Vercel estas variables para Production, Preview y Development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No configures `SUPABASE_DB_URL` en Vercel; esa variable pertenece a Supabase Edge Functions.

4. Despliega a produccion:

```bash
vercel --prod
```

5. Si cambiaste el schema o la Edge Function, vuelve a ejecutar el SQL en Supabase y redespliega la funcion:

```bash
supabase functions deploy draw
```

## Error 401 al crear sala

Un 401 al crear sala normalmente indica que Supabase rechazo la `anon key` o que la URL del proyecto no corresponde a esa key. Verifica:

- `NEXT_PUBLIC_SUPABASE_URL` apunta al proyecto correcto.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` es la anon public key actual del mismo proyecto.
- Las variables estan configuradas en `.env.local` y en Vercel.
- Reiniciaste `npm run dev` despues de cambiar `.env.local`.

Si la key es correcta pero aparece un error RLS, vuelve a ejecutar `supabase/schema.sql`.
