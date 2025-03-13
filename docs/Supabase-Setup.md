# Supabase Setup Guide for Map Painter .io

This guide will walk you through setting up Supabase for the Map Painter .io game, including creating a project, configuring the database schema, and enabling real-time subscriptions.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign in or create an account.
2. Click "New Project" and fill in the details:
   - **Name**: `map-painter-io` (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose the region closest to your users
3. Click "Create New Project" and wait for it to be provisioned (this may take a few minutes).

## 2. Get API Keys

1. Once your project is created, go to the project dashboard.
2. In the left sidebar, click on "Project Settings" > "API".
3. You'll find two important keys:
   - **URL**: Your Supabase project URL
   - **anon/public key**: The anonymous API key for client-side access

## 3. Configure Environment Variables

1. In your Map Painter .io project, create or update the `.env.local` file with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 4. Set Up Database Schema

You can set up the database schema in two ways:

### Option 1: Using the SQL Editor

1. In the Supabase dashboard, go to the "SQL Editor" section.
2. Create a new query and paste the contents of `src/lib/supabase/schema.sql`.
3. Run the query to create all the necessary tables and configurations.

### Option 2: Using the Supabase CLI

1. Install the Supabase CLI if you haven't already:

   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase in your project:

   ```bash
   supabase init
   ```

3. Link your project:

   ```bash
   supabase link --project-ref your_project_ref
   ```

4. Push the schema:
   ```bash
   supabase db push
   ```

## 5. Enable Realtime

1. In the Supabase dashboard, go to "Database" > "Replication".
2. Under "Realtime", ensure that the following tables are enabled for real-time updates:

   - `map_states`
   - `players`

3. You can also enable real-time for these tables using SQL:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE map_states;
   ALTER PUBLICATION supabase_realtime ADD TABLE players;
   ```

## 6. Test the Connection

1. Run your Map Painter .io application:

   ```bash
   npm run dev
   ```

2. Open the browser console and check for messages indicating a successful connection to Supabase.
3. You should see logs like "Supabase authentication initialized successfully" and "Realtime connection successful!".

## 7. Database Structure

The database schema includes the following tables:

- **game_instances**: Tracks unique game rooms
- **players**: Stores player data per instance
- **map_states**: Tracks state ownership and resources
- **adjacency**: Defines state adjacency relationships
- **game_events**: Logs game events for analytics

## 8. Troubleshooting

- **Connection Issues**: Ensure your environment variables are correctly set and that your Supabase project is active.
- **Real-time Not Working**: Check that real-time is enabled for the required tables and that your subscription filters are correct.
- **Permission Errors**: Verify that the Row Level Security (RLS) policies are properly configured to allow the necessary operations.

## 9. Next Steps

After setting up Supabase, you can:

1. Create a game instance
2. Add players to the game
3. Initialize map states
4. Set up adjacency relationships
5. Test real-time updates by making changes to the database

For more information, refer to the [Supabase documentation](https://supabase.com/docs) and the Map Painter .io codebase.
