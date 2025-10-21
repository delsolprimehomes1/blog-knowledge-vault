import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the current user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if the requester is an admin
    const { data: requesterRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !requesterRole) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Parse request body
    const { action, userId, role, notes } = await req.json();

    if (!action || !userId || !role) {
      throw new Error('Missing required fields: action, userId, role');
    }

    if (!['grant', 'revoke'].includes(action)) {
      throw new Error('Invalid action. Must be "grant" or "revoke"');
    }

    let result;

    if (action === 'grant') {
      // Grant role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
          notes: notes
        });

      if (insertError) {
        // Check if role already exists
        if (insertError.code === '23505') {
          throw new Error('User already has this role');
        }
        throw insertError;
      }

      // Log the action
      await supabase
        .from('user_role_changes')
        .insert({
          target_user_id: userId,
          action: 'granted',
          role: role,
          performed_by: user.id,
          notes: notes
        });

      result = { success: true, message: 'Role granted successfully' };
    } else if (action === 'revoke') {
      // Revoke role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (deleteError) throw deleteError;

      // Log the action
      await supabase
        .from('user_role_changes')
        .insert({
          target_user_id: userId,
          action: 'revoked',
          role: role,
          performed_by: user.id,
          notes: notes
        });

      result = { success: true, message: 'Role revoked successfully' };
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error in manage-user-role:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
