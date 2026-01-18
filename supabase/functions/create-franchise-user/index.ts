import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    console.log("Creating franchise user - starting");

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with caller's token to verify identity
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) {
      console.log("Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Caller verified:", caller.id);

    // Check if caller is super_admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      console.log("Caller is not super_admin");
      return new Response(
        JSON.stringify({ success: false, error: "Akses ditolak. Hanya Super Admin yang dapat membuat franchise." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Caller is super_admin, proceeding...");

    // Parse request body
    const { email, password, name, profit_sharing_percent } = await req.json();

    if (!email || !password || !name) {
      console.log("Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Email, password, dan nama wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating user with email:", email);

    // Create admin client to create user WITHOUT affecting current session
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create user using Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      console.log("Error creating user:", createError.message);
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User created:", newUser.user.id);

    // 2. Create franchise record
    const { data: franchiseData, error: franchiseError } = await supabaseAdmin
      .from('franchises')
      .insert({
        name,
        user_id: newUser.user.id,
        profit_sharing_percent: profit_sharing_percent || 10,
      })
      .select()
      .single();

    if (franchiseError) {
      console.log("Error creating franchise, rolling back user:", franchiseError.message);
      // Rollback: delete created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ success: false, error: franchiseError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Franchise created:", franchiseData.id);

    // 3. Assign franchise role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'franchise',
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
    } else {
      console.log("Role assigned: franchise");
    }

    // 4. Create default admin_settings
    const { error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .insert({
        franchise_id: franchiseData.id,
        admin_fee_percent: 5,
        fixed_deduction: 1000,
      });

    if (settingsError) {
      console.error('Error creating settings:', settingsError);
    } else {
      console.log("Default settings created");
    }

    console.log("Franchise user creation completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Franchise berhasil dibuat",
        franchise_id: franchiseData.id,
        user_id: newUser.user.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Terjadi kesalahan pada server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
