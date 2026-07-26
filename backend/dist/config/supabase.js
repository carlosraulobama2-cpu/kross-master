"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados en el backend');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl || '', supabaseServiceRoleKey || '');
