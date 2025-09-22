-- Permitir que o usuário jgmsoftworks@gmail.com seja admin
UPDATE profiles 
SET is_admin = true 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'jgmsoftworks@gmail.com'
);