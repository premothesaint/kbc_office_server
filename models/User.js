const supabase = require('../config/supabase');

class User {
  static async create(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        full_name: userData.full_name,
        department: userData.department,
        is_active: true
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  static async findByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, role, full_name, department, created_at, is_active')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, role, full_name, department, created_at, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async update(id, userData) {
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: userData.full_name,
        department: userData.department,
        role: userData.role
      })
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return (data && data.length) ? 1 : 0;
  }

  static async deactivate(id) {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return (data && data.length) ? 1 : 0;
  }

  static async activate(id) {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return (data && data.length) ? 1 : 0;
  }
}

module.exports = User;
